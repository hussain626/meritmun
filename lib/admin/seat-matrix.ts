/**
 * Committee × country seat matrix. Pure, shared by the country matrix,
 * roll-call sheets, and waivers so every view counts seats the same way.
 */

import type {
  AllotmentRecord,
  CommitteeAdminRecord,
  DelegateRecord,
  DelegationRecord,
  Portfolio,
} from "@/lib/admin/types";

export type SeatHolder = {
  delegate: DelegateRecord;
  allotment: AllotmentRecord;
  delegationName: string | null;
};

export type Seat = {
  portfolio: Portfolio;
  holder: SeatHolder | null;
  /** Double-delegate committees: which of the country's two seats (1 or 2). */
  slot?: number;
};

export type CommitteeSeats = {
  committee: CommitteeAdminRecord;
  /** Active pool countries, A–Z, with their holder if taken. */
  seats: Seat[];
  /** Held seats whose country has since been deactivated in the pool. */
  offPool: Seat[];
  total: number;
  taken: number;
  left: number;
};

export function buildSeatMatrix(input: {
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
  allotments: AllotmentRecord[];
  delegates: DelegateRecord[];
  delegations: DelegationRecord[];
}): CommitteeSeats[] {
  const delegateById = new Map(input.delegates.map((d) => [d.id, d]));
  const delegationName = new Map(
    input.delegations.map((d) => [d.id, d.institutionName]),
  );
  const holdersByPortfolio = new Map<string, SeatHolder[]>();
  for (const allotment of input.allotments) {
    const delegate = delegateById.get(allotment.delegateId);
    if (!delegate) continue;
    const list = holdersByPortfolio.get(allotment.portfolioId) ?? [];
    holdersByPortfolio.set(allotment.portfolioId, list);
    list.push({
      delegate,
      allotment,
      delegationName: delegate.delegationId
        ? (delegationName.get(delegate.delegationId) ?? null)
        : null,
    });
  }

  // One Seat per seat, not per country: a double-delegate committee lists
  // each country twice (slots 1 and 2), so every count stays seat-accurate.
  const slotsFor = (portfolio: Portfolio, capacity: number): Seat[] => {
    const list = holdersByPortfolio.get(portfolio.id) ?? [];
    const slots = Math.max(capacity, list.length);
    return Array.from({ length: slots }, (_, i) => ({
      portfolio,
      holder: list[i] ?? null,
      ...(capacity > 1 ? { slot: i + 1 } : {}),
    }));
  };

  return input.committees.map((committee) => {
    const capacity = committee.isDoubleDelegate ? 2 : 1;
    const pool = input.portfolios
      .filter((p) => p.committeeId === committee.id)
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
    const seats = pool
      .filter((p) => p.isActive)
      .flatMap((portfolio) => slotsFor(portfolio, capacity));
    const offPool = pool
      .filter((p) => !p.isActive && holdersByPortfolio.has(p.id))
      .flatMap((portfolio) => slotsFor(portfolio, capacity).filter((s) => s.holder));
    const takenInPool = seats.filter((s) => s.holder).length;
    return {
      committee,
      seats,
      offPool,
      total: seats.length,
      taken: takenInPool + offPool.length,
      left: seats.length - takenInPool,
    };
  });
}
