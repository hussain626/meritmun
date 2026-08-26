/**
 * Merit engine stub: ranks open non-P5 portfolios for a paid delegate.
 * Uses Gemini when GEMINI_API_KEY is set; otherwise a local hardness heuristic.
 * Hard rule: never assign P5, even as a fallback.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AllotmentRecord,
  DelegateRecord,
  Portfolio,
} from "@/lib/admin/types";
import { isP5Country } from "@/lib/merit/p5";
import type { ExperienceLevel } from "@/lib/types";

export type MeritCandidate = {
  portfolio: Portfolio;
  committeeId: string;
  committeeSlug?: string;
  agenda?: string;
  hardnessScore?: number;
};

export type MeritRunInput = {
  delegate: DelegateRecord;
  candidates: MeritCandidate[];
  /** Portfolios already held (draft or confirmed) — excluded from assignment. */
  takenPortfolioIds?: ReadonlySet<string>;
};

export type MeritAllotmentDraft = Pick<
  AllotmentRecord,
  | "delegateId"
  | "committeeId"
  | "portfolioId"
  | "source"
  | "status"
  | "rationale"
  | "score"
>;

export type MeritRunResult =
  | { ok: true; allotment: MeritAllotmentDraft }
  | { ok: false; error: string };

const EXPERIENCE_WEIGHT: Record<ExperienceLevel, number> = {
  "first-time": 0.25,
  "1-3": 0.5,
  "4-9": 0.75,
  "10-plus": 1,
};

type RankedPick = {
  portfolioId: string;
  committeeId: string;
  score: number;
  rationale: string;
};

function openNonP5Candidates(
  input: MeritRunInput,
): MeritCandidate[] {
  const taken = input.takenPortfolioIds ?? new Set<string>();
  return input.candidates.filter((candidate) => {
    const { portfolio } = candidate;
    if (!portfolio.isActive) return false;
    if (taken.has(portfolio.id)) return false;
    if (portfolio.isP5 || isP5Country(portfolio.countryName)) return false;
    return true;
  });
}

function heuristicPick(
  delegate: DelegateRecord,
  open: MeritCandidate[],
): RankedPick | null {
  if (open.length === 0) return null;

  const prefOrder = new Map(
    delegate.committeePrefs.map((slug, index) => [slug, index]),
  );
  const experience = EXPERIENCE_WEIGHT[delegate.experience];

  const scored = open.map((candidate) => {
    const hardness = candidate.portfolio.hardness / 10;
    const committeeHardness = (candidate.hardnessScore ?? 5) / 10;
    const prefIndex =
      candidate.committeeSlug != null
        ? prefOrder.get(candidate.committeeSlug)
        : undefined;
    const prefBoost =
      prefIndex === undefined ? 0 : Math.max(0, (3 - prefIndex) * 0.08);

    // Experienced delegates prefer harder seats; novices prefer softer ones.
    const hardnessFit = 1 - Math.abs(hardness - experience);
    const score =
      hardnessFit * 0.55 +
      hardness * experience * 0.25 +
      committeeHardness * 0.1 +
      prefBoost;

    return {
      portfolioId: candidate.portfolio.id,
      committeeId: candidate.committeeId,
      score,
      rationale:
        `Heuristic: experience=${delegate.experience}, ` +
        `portfolio=${candidate.portfolio.countryName} (hardness ${candidate.portfolio.hardness}/10).`,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}

type GeminiRankRow = {
  portfolioId: string;
  relevanceScore: number;
  hardshipScore: number;
  rationale: string;
};

function parseGeminiRanks(raw: string): GeminiRankRow[] {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response did not contain a JSON array.");
  }

  const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response JSON was not an array.");
  }

  const rows: GeminiRankRow[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const portfolioId = record.portfolioId;
    if (typeof portfolioId !== "string") continue;
    rows.push({
      portfolioId,
      relevanceScore: Number(record.relevanceScore) || 0,
      hardshipScore: Number(record.hardshipScore) || 0,
      rationale:
        typeof record.rationale === "string"
          ? record.rationale
          : "Gemini rank.",
    });
  }
  return rows;
}

async function geminiPick(
  delegate: DelegateRecord,
  open: MeritCandidate[],
): Promise<RankedPick | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const modelName =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const payload = {
    experience: delegate.experience,
    priorAwards: delegate.priorAwards,
    committeePrefs: delegate.committeePrefs,
    candidates: open.map((c) => ({
      portfolioId: c.portfolio.id,
      countryName: c.portfolio.countryName,
      hardness: c.portfolio.hardness,
      committeeId: c.committeeId,
      committeeSlug: c.committeeSlug ?? null,
      agenda: c.agenda ?? null,
    })),
  };

  const prompt =
    `You rank Model UN country portfolios for allotment.\n` +
    `Return ONLY a JSON array of objects: ` +
    `{ "portfolioId": string, "relevanceScore": number 0-1, "hardshipScore": number 0-1, "rationale": string }.\n` +
    `Prefer agenda-relevant, harder portfolios for more experienced delegates.\n` +
    `Never recommend USA, China, Russia, UK, or France (P5).\n` +
    `Input:\n${JSON.stringify(payload)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const ranks = parseGeminiRanks(text);
  if (ranks.length === 0) return null;

  const byId = new Map(open.map((c) => [c.portfolio.id, c]));
  const experience = EXPERIENCE_WEIGHT[delegate.experience];

  const scored: RankedPick[] = [];
  for (const rank of ranks) {
    const candidate = byId.get(rank.portfolioId);
    if (!candidate) continue;
    if (
      candidate.portfolio.isP5 ||
      isP5Country(candidate.portfolio.countryName)
    ) {
      continue;
    }
    const score =
      rank.relevanceScore * 0.5 +
      rank.hardshipScore * 0.3 +
      experience * 0.2;
    scored.push({
      portfolioId: candidate.portfolio.id,
      committeeId: candidate.committeeId,
      score,
      rationale: rank.rationale,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}

/**
 * Produce a draft merit allotment. Never returns a P5 portfolio.
 */
export async function runMeritEngine(
  input: MeritRunInput,
): Promise<MeritRunResult> {
  const open = openNonP5Candidates(input);
  if (open.length === 0) {
    return {
      ok: false,
      error: "No open non-P5 portfolios available for allotment.",
    };
  }

  let pick: RankedPick | null = null;

  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      pick = await geminiPick(input.delegate, open);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gemini merit run failed.";
      return { ok: false, error: message };
    }

    if (!pick) {
      return {
        ok: false,
        error:
          "Gemini returned no usable non-P5 rankings. Fail closed — no allotment.",
      };
    }
  } else {
    pick = heuristicPick(input.delegate, open);
    if (!pick) {
      return {
        ok: false,
        error: "Heuristic merit run found no candidate.",
      };
    }
  }

  // Final safety: never emit P5 even if an upstream path misfires.
  const chosen = open.find((c) => c.portfolio.id === pick.portfolioId);
  if (
    !chosen ||
    chosen.portfolio.isP5 ||
    isP5Country(chosen.portfolio.countryName)
  ) {
    return {
      ok: false,
      error: "Merit engine refused a P5 assignment.",
    };
  }

  return {
    ok: true,
    allotment: {
      delegateId: input.delegate.id,
      committeeId: pick.committeeId,
      portfolioId: pick.portfolioId,
      source: "merit",
      status: "draft",
      rationale: pick.rationale,
      score: Number(pick.score.toFixed(4)),
    },
  };
}
