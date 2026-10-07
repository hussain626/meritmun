/**
 * Committee × country seat matrix. Pure — shared by the country matrix,
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
  const holderByPortfolio = new Map<string, SeatHolder>();
  for (const allotment of input.allotments) {
    const delegate = delegateById.get(allotment.delegateId);
    if (!delegate) continue;
    holderByPortfolio.set(allotment.portfolioId, {
      delegate,
      allotment,
      delegationName: delegate.delegationId
        ? (delegationName.get(delegate.delegationId) ?? null)
        : null,
    });
  }

  return input.committees.map((committee) => {
    const pool = input.portfolios
      .filter((p) => p.committeeId === committee.id)
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
    const seats = pool
      .filter((p) => p.isActive)
      .map((portfolio) => ({
        portfolio,
        holder: holderByPortfolio.get(portfolio.id) ?? null,
      }));
    const offPool = pool
      .filter((p) => !p.isActive && holderByPortfolio.has(p.id))
      .map((portfolio) => ({
        portfolio,
        holder: holderByPortfolio.get(portfolio.id) ?? null,
      }));
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
