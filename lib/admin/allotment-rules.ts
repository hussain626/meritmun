/**
 * Allotment rules: defaults, sanitising, and the fixed rules the engine
 * always applies. Shared by the admin data layer, actions, and UI.
 */

import type { AllotmentFallbackMode, AllotmentRules } from "@/lib/admin/types";

export const DEFAULT_ALLOTMENT_RULES: AllotmentRules = {
  advancedMinScore: 40,
  intermediateMinScore: 0,
  preferenceDepth: 3,
  fallbackMode: "emptiest",
  delegationCommitteeCap: 0,
  matchHardness: true,
  useAiScoring: true,
  updatedAt: new Date(0).toISOString(),
};

/** Rules that cannot be switched off — shown read-only on the rules page. */
export const FIXED_ALLOTMENT_RULES: string[] = [
  "P5 seats (USA, China, Russia, UK, France) are never auto-allotted. EB can assign them by hand.",
  "Only delegates with a confirmed payment enter the merit engine.",
  "One seat per delegate, and one delegate per country in each committee.",
  "Confirmed and manual allotments are locked — re-runs only replace merit drafts.",
  "Paused committees and inactive countries are skipped by the engine.",
  "Higher merit scores are seated first; ties go to the earlier registration.",
];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeAllotmentRules(
  input: Partial<AllotmentRules>,
): Omit<AllotmentRules, "updatedAt"> {
  const d = DEFAULT_ALLOTMENT_RULES;
  const fallbackMode: AllotmentFallbackMode =
    input.fallbackMode === "none" ? "none" : "emptiest";
  return {
    advancedMinScore: clampInt(input.advancedMinScore, 0, 100, d.advancedMinScore),
    intermediateMinScore: clampInt(
      input.intermediateMinScore,
      0,
      100,
      d.intermediateMinScore,
    ),
    preferenceDepth: clampInt(input.preferenceDepth, 1, 3, d.preferenceDepth),
    fallbackMode,
    delegationCommitteeCap: clampInt(
      input.delegationCommitteeCap,
      0,
      50,
      d.delegationCommitteeCap,
    ),
    matchHardness: input.matchHardness ?? d.matchHardness,
    useAiScoring: input.useAiScoring ?? d.useAiScoring,
  };
}

export function mapAllotmentRules(row: Record<string, unknown>): AllotmentRules {
  return {
    ...sanitizeAllotmentRules({
      advancedMinScore: Number(row.advanced_min_score),
      intermediateMinScore: Number(row.intermediate_min_score),
      preferenceDepth: Number(row.preference_depth),
      fallbackMode: row.fallback_mode as AllotmentFallbackMode,
      delegationCommitteeCap: Number(row.delegation_committee_cap),
      matchHardness: Boolean(row.match_hardness),
      useAiScoring: Boolean(row.use_ai_scoring),
    }),
    updatedAt: String(row.updated_at),
  };
}
