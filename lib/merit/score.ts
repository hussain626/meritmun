/**
 * Merit scoring (0–100) from experience band + prior awards.
 * Gemini scores in batches when enabled; otherwise a local heuristic.
 * Only the experience band and awards text leave the server — no names,
 * emails, or phone numbers.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DelegateRecord } from "@/lib/admin/types";
import type { ExperienceLevel } from "@/lib/types";

const SCORE_CHUNK = 40;
const AWARDS_MAX_CHARS = 600;

const EXPERIENCE_BASE: Record<ExperienceLevel, number> = {
  "first-time": 10,
  "1-3": 35,
  "4-9": 60,
  "10-plus": 80,
};

const AWARD_PATTERN =
  /\b(best delegate|outstanding|honou?rable mention|special mention|verbal|award|winner|won)\b/i;
const LEADERSHIP_PATTERN =
  /\b(chair|co-chair|eb|executive board|secretariat|secretary[- ]general|usg|director|president|head delegate)\b/i;

export type ScoreSource = "ai" | "heuristic";

export type ScoreResult =
  | { ok: true; scores: Map<string, number>; source: ScoreSource; calls: number }
  | { ok: false; error: string };

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function heuristicScore(
  delegate: Pick<DelegateRecord, "experience" | "priorAwards">,
): number {
  let score = EXPERIENCE_BASE[delegate.experience] ?? 10;
  const awards = delegate.priorAwards?.trim() ?? "";
  if (awards && !/^(none|no|n\/a|-)$/i.test(awards)) {
    score += 5;
    if (AWARD_PATTERN.test(awards)) score += 10;
    if (LEADERSHIP_PATTERN.test(awards)) score += 10;
  }
  return clampScore(score);
}

function parseScoreArray(raw: string, size: number): number[] {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end <= start) {
    throw new Error("Gemini response did not contain a JSON array.");
  }
  const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response JSON was not an array.");
  }

  const scores: number[] = new Array(size).fill(Number.NaN);
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const index = Number(record.i);
    const score = Number(record.score);
    if (!Number.isInteger(index) || index < 0 || index >= size) continue;
    if (!Number.isFinite(score)) continue;
    scores[index] = clampScore(score);
  }
  if (scores.some((s) => Number.isNaN(s))) {
    throw new Error("Gemini skipped some delegates in its response.");
  }
  return scores;
}

async function scoreChunkWithGemini(
  apiKey: string,
  chunk: Pick<DelegateRecord, "experience" | "priorAwards">[],
): Promise<number[]> {
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  const payload = chunk.map((d, i) => ({
    i,
    experienceBand: d.experience,
    priorAwards: (d.priorAwards ?? "").slice(0, AWARDS_MAX_CHARS),
  }));

  const prompt =
    `You score Model UN delegates for merit-based seat allotment.\n` +
    `For each delegate return a score 0-100 from their experience band ` +
    `(number of MUNs attended: first-time, 1-3, 4-9, 10-plus) and prior awards text.\n` +
    `Rubric: 0-10 no experience; 10-30 first-timer or debate only; 30-55 one to three MUNs; ` +
    `55-75 four to nine MUNs or awards; 75-100 many MUNs with awards or chair/EB/secretariat roles.\n` +
    `Return ONLY a JSON array of { "i": number, "score": number }, one per input.\n` +
    `Input:\n${JSON.stringify(payload)}`;

  const result = await model.generateContent(prompt);
  return parseScoreArray(result.response.text(), chunk.length);
}

/**
 * Score every delegate. With AI on and a key present, Gemini failure fails
 * the whole run closed (no seats) — EB can switch AI scoring off in rules.
 */
export async function scoreDelegates(
  delegates: DelegateRecord[],
  useAi: boolean,
): Promise<ScoreResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const scores = new Map<string, number>();

  if (!useAi || !apiKey) {
    for (const d of delegates) scores.set(d.id, heuristicScore(d));
    return { ok: true, scores, source: "heuristic", calls: 0 };
  }

  let calls = 0;
  try {
    for (let i = 0; i < delegates.length; i += SCORE_CHUNK) {
      const chunk = delegates.slice(i, i + SCORE_CHUNK);
      calls += 1;
      const chunkScores = await scoreChunkWithGemini(apiKey, chunk);
      chunk.forEach((d, index) => scores.set(d.id, chunkScores[index] ?? 0));
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gemini scoring failed.";
    return {
      ok: false,
      error: `AI scoring failed (${message}). No seats were changed. Retry, or switch AI scoring off in Allotment rules to use the built-in heuristic.`,
    };
  }

  return { ok: true, scores, source: "ai", calls };
}
