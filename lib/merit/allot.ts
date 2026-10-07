/**
 * Deterministic seat planner. Given merit scores, the country pool
 * (`portfolios`), seats already held, and the allotment rules, place each
 * delegate in a committee + country. Pure — no I/O — so the same logic runs
 * against Supabase and the demo store.
 *
 * Hard rules enforced here regardless of settings:
 *  - never place a P5 seat
 *  - skip paused committees and inactive portfolios
 *  - one delegate per portfolio
 */

import type {
  AllotmentRules,
  CommitteeAdminRecord,
  DelegateRecord,
  Portfolio,
} from "@/lib/admin/types";
import { isP5Country } from "@/lib/merit/p5";

export type Placement = {
  delegateId: string;
  committeeId: string;
  portfolioId: string;
  score: number;
  rationale: string;
};

export type Unplaced = {
  delegateId: string;
  score: number;
  reason: string;
};

export type PlanInput = {
  delegates: DelegateRecord[];
  scores: ReadonlyMap<string, number>;
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
  /** Portfolio ids already held by allotments the run must not touch. */
  takenPortfolioIds: ReadonlySet<string>;
  /** `${delegationId}:${committeeId}` → members already seated there. */
  delegationCommitteeCounts: ReadonlyMap<string, number>;
  rules: AllotmentRules;
};

export type PlanResult = {
  placements: Placement[];
  unplaced: Unplaced[];
};

export function isAutoAllottable(portfolio: Portfolio): boolean {
  return (
    portfolio.isActive && !portfolio.isP5 && !isP5Country(portfolio.countryName)
  );
}

function minScoreFor(
  committee: CommitteeAdminRecord,
  rules: AllotmentRules,
): number {
  if (committee.difficulty === "advanced") return rules.advancedMinScore;
  if (committee.difficulty === "intermediate") return rules.intermediateMinScore;
  return 0;
}

function label(committee: CommitteeAdminRecord): string {
  return committee.abbr || committee.name;
}

export function planAllotments(input: PlanInput): PlanResult {
  const { rules, scores } = input;
  const taken = new Set(input.takenPortfolioIds);
  const delegationCounts = new Map(input.delegationCommitteeCounts);
  const bySlug = new Map(input.committees.map((c) => [c.slug, c]));

  const poolByCommittee = new Map<string, Portfolio[]>();
  for (const portfolio of input.portfolios) {
    if (!isAutoAllottable(portfolio)) continue;
    const list = poolByCommittee.get(portfolio.committeeId) ?? [];
    list.push(portfolio);
    poolByCommittee.set(portfolio.committeeId, list);
  }

  const freeSeats = (committee: CommitteeAdminRecord): Portfolio[] => {
    if (committee.allotmentsPaused) return [];
    return (poolByCommittee.get(committee.id) ?? []).filter(
      (p) => !taken.has(p.id),
    );
  };

  const underCap = (person: DelegateRecord, committeeId: string): boolean => {
    if (!person.delegationId || rules.delegationCommitteeCap <= 0) return true;
    const count =
      delegationCounts.get(`${person.delegationId}:${committeeId}`) ?? 0;
    return count < rules.delegationCommitteeCap;
  };

  const ordered = [...input.delegates].sort(
    (a, b) =>
      (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.fullName.localeCompare(b.fullName),
  );

  const placements: Placement[] = [];
  const unplaced: Unplaced[] = [];

  for (const person of ordered) {
    const score = scores.get(person.id) ?? 0;
    const qualifies = (c: CommitteeAdminRecord) => score >= minScoreFor(c, rules);
    const available = (c: CommitteeAdminRecord) =>
      qualifies(c) && underCap(person, c.id) && freeSeats(c).length > 0;

    const prefs = person.committeePrefs
      .slice(0, rules.preferenceDepth)
      .map((slug) => bySlug.get(slug))
      .filter((c): c is CommitteeAdminRecord => Boolean(c));

    let committee: CommitteeAdminRecord | undefined;
    let why = "";

    const prefIndex = prefs.findIndex(available);
    if (prefIndex >= 0) {
      committee = prefs[prefIndex];
      why = `Preference #${prefIndex + 1} (${label(committee!)}).`;
    } else if (rules.fallbackMode === "emptiest") {
      committee = input.committees
        .filter(available)
        .sort(
          (a, b) =>
            freeSeats(b).length - freeSeats(a).length ||
            a.sortOrder - b.sortOrder,
        )[0];
      if (committee) {
        const blocked = prefs
          .map((c) =>
            !qualifies(c)
              ? `${label(c)} needs merit ${minScoreFor(c, rules)}+`
              : !underCap(person, c.id)
                ? `${label(c)} at delegation cap`
                : `${label(c)} full or paused`,
          )
          .join("; ");
        why = `Preferences unavailable${blocked ? ` (${blocked})` : ""} — placed in ${label(committee)}, the committee with the most open seats.`;
      }
    }

    if (!committee) {
      unplaced.push({
        delegateId: person.id,
        score,
        reason:
          prefs.length === 0
            ? "No valid committee preferences and fallback is off — EB must place by hand."
            : rules.fallbackMode === "none"
              ? "Ranked committees are full, paused, or above this delegate's merit — fallback is off, so EB must place by hand."
              : "No committee has an open, eligible seat. Add countries to the pool or place by hand.",
      });
      continue;
    }

    const seats = freeSeats(committee);
    let seat: Portfolio;
    if (rules.matchHardness) {
      // Strong delegates get the hardest seats; newcomers get gentler ones.
      const target = 1 + (score / 100) * 9;
      seat = [...seats].sort(
        (a, b) =>
          Math.abs(a.hardness - target) - Math.abs(b.hardness - target) ||
          b.hardness - a.hardness ||
          a.countryName.localeCompare(b.countryName),
      )[0]!;
    } else {
      seat = [...seats].sort((a, b) =>
        a.countryName.localeCompare(b.countryName),
      )[0]!;
    }

    taken.add(seat.id);
    if (person.delegationId) {
      const key = `${person.delegationId}:${committee.id}`;
      delegationCounts.set(key, (delegationCounts.get(key) ?? 0) + 1);
    }

    placements.push({
      delegateId: person.id,
      committeeId: committee.id,
      portfolioId: seat.id,
      score,
      rationale: `Merit ${score}. ${why} ${seat.countryName} (hardness ${seat.hardness}/10).`,
    });
  }

  return { placements, unplaced };
}
