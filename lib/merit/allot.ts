/**
 * Deterministic seat planner. Given merit scores, the country pool
 * (`portfolios`), seats already held, and the allotment rules, place each
 * delegate in a committee + country. Pure, no I/O, so the same logic runs
 * against Supabase and the demo store.
 *
 * Hard rules enforced here regardless of settings:
 *  - never place a P5 seat
 *  - skip paused or unpublished committees and inactive portfolios
 *  - one delegate per portfolio, two in a double-delegate committee
 *  - delegates who share a `pairId` are seated together on one portfolio
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

/** Who already holds a portfolio the run must not touch. */
export type SeatHolder = { delegateId: string; pairId: string | null };

export type PlanInput = {
  delegates: DelegateRecord[];
  scores: ReadonlyMap<string, number>;
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
  /** portfolioId -> holders kept from before the run. */
  held: ReadonlyMap<string, readonly SeatHolder[]>;
  /** `${delegationId}:${committeeId}` -> members already seated there. */
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

/** Seats per country: two in a double-delegate committee, otherwise one. */
export function seatCapacity(committee: CommitteeAdminRecord | undefined): number {
  return committee?.isDoubleDelegate ? 2 : 1;
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

/** One placement decision: a single delegate, or a pair seated together. */
type Unit = { members: DelegateRecord[]; score: number; pairId: string | null };

export function planAllotments(input: PlanInput): PlanResult {
  const { rules, scores } = input;
  const holders = new Map<string, SeatHolder[]>(
    [...input.held].map(([id, list]) => [id, [...list]]),
  );
  const delegationCounts = new Map(input.delegationCommitteeCounts);
  const bySlug = new Map(input.committees.map((c) => [c.slug, c]));
  const committeeById = new Map(input.committees.map((c) => [c.id, c]));

  const poolByCommittee = new Map<string, Portfolio[]>();
  for (const portfolio of input.portfolios) {
    if (!isAutoAllottable(portfolio)) continue;
    const list = poolByCommittee.get(portfolio.committeeId) ?? [];
    list.push(portfolio);
    poolByCommittee.set(portfolio.committeeId, list);
  }

  const heldCount = (portfolioId: string) => holders.get(portfolioId)?.length ?? 0;

  // Unpublished committees are not offered to delegates, so the engine never
  // seats anyone there, not by preference and not by fallback.
  const freeSeats = (committee: CommitteeAdminRecord, need: number): Portfolio[] => {
    if (committee.allotmentsPaused || !committee.isPublished) return [];
    const capacity = seatCapacity(committee);
    if (need > capacity) return [];
    return (poolByCommittee.get(committee.id) ?? []).filter(
      (p) => heldCount(p.id) + need <= capacity,
    );
  };

  const underCap = (unit: Unit, committeeId: string): boolean => {
    const delegationId = unit.members[0]?.delegationId;
    if (!delegationId || rules.delegationCommitteeCap <= 0) return true;
    const count = delegationCounts.get(`${delegationId}:${committeeId}`) ?? 0;
    return count + unit.members.length <= rules.delegationCommitteeCap;
  };

  /* ── Build units: pairs travel together ─────────────────────────────── */

  const byPair = new Map<string, DelegateRecord[]>();
  const units: Unit[] = [];
  for (const person of input.delegates) {
    if (person.pairId) {
      const list = byPair.get(person.pairId) ?? [];
      list.push(person);
      byPair.set(person.pairId, list);
    } else {
      units.push({ members: [person], score: scores.get(person.id) ?? 0, pairId: null });
    }
  }
  for (const [pairId, members] of byPair) {
    const score = Math.round(
      members.reduce((sum, m) => sum + (scores.get(m.id) ?? 0), 0) / members.length,
    );
    units.push({ members, score, pairId });
  }

  units.sort(
    (a, b) =>
      b.score - a.score ||
      a.members[0]!.createdAt.localeCompare(b.members[0]!.createdAt) ||
      a.members[0]!.fullName.localeCompare(b.members[0]!.fullName),
  );

  const placements: Placement[] = [];
  const unplaced: Unplaced[] = [];

  const place = (
    unit: Unit,
    committee: CommitteeAdminRecord,
    seat: Portfolio,
    why: string,
  ) => {
    const list = holders.get(seat.id) ?? [];
    for (const person of unit.members) {
      list.push({ delegateId: person.id, pairId: unit.pairId });
      placements.push({
        delegateId: person.id,
        committeeId: committee.id,
        portfolioId: seat.id,
        score: scores.get(person.id) ?? unit.score,
        rationale: `Merit ${scores.get(person.id) ?? unit.score}. ${why} ${seat.countryName} (hardness ${seat.hardness}/10).`,
      });
    }
    holders.set(seat.id, list);
    const delegationId = unit.members[0]?.delegationId;
    if (delegationId) {
      const key = `${delegationId}:${committee.id}`;
      delegationCounts.set(key, (delegationCounts.get(key) ?? 0) + unit.members.length);
    }
  };

  const fail = (unit: Unit, reason: string) => {
    for (const person of unit.members) {
      unplaced.push({ delegateId: person.id, score: scores.get(person.id) ?? unit.score, reason });
    }
  };

  /** Hardness-matched (or alphabetical) choice among candidate seats. */
  const pickSeat = (candidates: Portfolio[], score: number): Portfolio => {
    if (rules.matchHardness) {
      // Strong delegates get the hardest seats; newcomers get gentler ones.
      const target = 1 + (score / 100) * 9;
      return [...candidates].sort(
        (a, b) =>
          Math.abs(a.hardness - target) - Math.abs(b.hardness - target) ||
          b.hardness - a.hardness ||
          a.countryName.localeCompare(b.countryName),
      )[0]!;
    }
    return [...candidates].sort((a, b) => a.countryName.localeCompare(b.countryName))[0]!;
  };

  for (const unit of units) {
    const lead = unit.members[0]!;
    const need = unit.members.length;

    // A pair member whose partner already holds a seat joins that seat.
    if (unit.pairId && need === 1) {
      const partnerSeat = [...holders].find(([, list]) =>
        list.some((h) => h.pairId === unit.pairId),
      );
      if (partnerSeat) {
        const seat = input.portfolios.find((p) => p.id === partnerSeat[0]);
        const committee = seat ? committeeById.get(seat.committeeId) : undefined;
        if (seat && committee && heldCount(seat.id) < seatCapacity(committee)) {
          place(unit, committee, seat, `Joins their co-delegate in ${label(committee)}.`);
          continue;
        }
      }
    }

    const qualifies = (c: CommitteeAdminRecord) => unit.score >= minScoreFor(c, rules);
    const available = (c: CommitteeAdminRecord) =>
      qualifies(c) && underCap(unit, c.id) && freeSeats(c, need).length > 0;

    // A pair is committed to its shared first choice (a double-delegate committee).
    const prefs = (need > 1 ? lead.committeePrefs.slice(0, 1) : lead.committeePrefs)
      .slice(0, rules.preferenceDepth)
      .map((slug) => bySlug.get(slug))
      .filter((c): c is CommitteeAdminRecord => Boolean(c));

    let committee: CommitteeAdminRecord | undefined;
    let why = "";

    const prefIndex = prefs.findIndex(available);
    if (prefIndex >= 0) {
      committee = prefs[prefIndex];
      why =
        need > 1
          ? `Co-delegates, first choice (${label(committee!)}).`
          : `Preference #${prefIndex + 1} (${label(committee!)}).`;
    } else if (rules.fallbackMode === "emptiest") {
      committee = input.committees
        .filter((c) => (need > 1 ? c.isDoubleDelegate : true))
        .filter(available)
        .sort(
          (a, b) =>
            freeSeats(b, need).length - freeSeats(a, need).length ||
            a.sortOrder - b.sortOrder,
        )[0];
      if (committee) {
        const blocked = prefs
          .map((c) =>
            !qualifies(c)
              ? `${label(c)} needs merit ${minScoreFor(c, rules)}+`
              : !underCap(unit, c.id)
                ? `${label(c)} at delegation cap`
                : `${label(c)} full, paused or unpublished`,
          )
          .join("; ");
        why = `Preferences unavailable${blocked ? ` (${blocked})` : ""}, placed in ${label(committee)}, the committee with the most open seats.`;
      }
    }

    if (!committee) {
      fail(
        unit,
        need > 1
          ? "No country in the co-delegates' committee has two free seats. Add countries or place them by hand."
          : prefs.length === 0
            ? rules.fallbackMode === "none"
              ? "No valid committee preferences and fallback is off, EB must place by hand."
              : "No valid committee preferences and no committee has an open, eligible seat, EB must place by hand."
            : rules.fallbackMode === "none"
              ? "Ranked committees are full, paused, or above this delegate's merit, fallback is off, so EB must place by hand."
              : "No committee has an open, eligible seat: the preferences and the emptiest-committee fallback are all full, paused or above this delegate's merit. Add countries to the pool or place by hand.",
      );
      continue;
    }

    let candidates = freeSeats(committee, need);
    // A single in a double-delegate committee first completes a country
    // already holding one unpaired delegate, so random co-delegates pair up.
    if (need === 1 && committee.isDoubleDelegate) {
      const halfFull = candidates.filter((p) => {
        const list = holders.get(p.id) ?? [];
        return list.length === 1 && list[0]!.pairId === null;
      });
      if (halfFull.length > 0) {
        candidates = halfFull;
        why += " Paired with a co-delegate.";
      } else {
        candidates = candidates.filter((p) => heldCount(p.id) === 0);
      }
    }
    if (candidates.length === 0) {
      fail(unit, `No open seat in ${label(committee)}. Add countries or place by hand.`);
      continue;
    }
    place(unit, committee, pickSeat(candidates, unit.score), why);
  }

  return { placements, unplaced };
}
