import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getAllotmentRules,
  listAllotments,
  listCommitteesAdmin,
  listDelegates,
  listDelegations,
  listLatestMeritRuns,
  listPortfolios,
} from "@/lib/admin/data";
import { AllotmentsClient, type AllotmentRow } from "./AllotmentsClient";

export const metadata: Metadata = {
  title: "Allotments",
  robots: { index: false, follow: false },
};

export default async function AllotmentsPage() {
  const session = await requireAdminSession();
  const [allotments, delegates, delegations, committees, portfolios, rules, meritRuns] =
    await Promise.all([
      listAllotments(),
      listDelegates(),
      listDelegations(),
      listCommitteesAdmin(),
      listPortfolios(),
      getAllotmentRules(),
      listLatestMeritRuns(),
    ]);

  const allotmentByDelegate = new Map(allotments.map((a) => [a.delegateId, a]));
  const committeeMap = new Map(committees.map((c) => [c.id, c]));
  const portfolioMap = new Map(portfolios.map((p) => [p.id, p]));
  const delegationMap = new Map(delegations.map((d) => [d.id, d]));
  const runMap = new Map(meritRuns.map((r) => [r.delegateId, r]));

  // Every paid delegate gets a row (seated or not), plus anyone who already
  // holds a seat — so EB sees who is still waiting, not just who is placed.
  const rows: AllotmentRow[] = delegates
    .filter(
      (d) => d.paymentStatus === "confirmed" || allotmentByDelegate.has(d.id),
    )
    .map((delegate) => {
      const allotment = allotmentByDelegate.get(delegate.id) ?? null;
      const committee = allotment ? committeeMap.get(allotment.committeeId) : null;
      const portfolio = allotment ? portfolioMap.get(allotment.portfolioId) : null;
      const run = runMap.get(delegate.id);
      return {
        delegate,
        allotment,
        delegationName: delegate.delegationId
          ? (delegationMap.get(delegate.delegationId)?.institutionName ?? null)
          : null,
        committeeLabel: committee?.abbr ?? committee?.name ?? null,
        countryName: portfolio?.countryName ?? null,
        isP5: portfolio?.isP5 ?? false,
        meritNote:
          !allotment && run?.status === "failed" ? run.error : null,
      };
    });

  const lastRunAt =
    meritRuns.map((r) => r.createdAt).sort().at(-1) ?? null;

  return (
    <AllotmentsClient
      rows={rows}
      committees={committees}
      portfolios={portfolios}
      takenPortfolios={allotments.map((a) => ({
        portfolioId: a.portfolioId,
        delegateId: a.delegateId,
      }))}
      rules={rules}
      role={session.role}
      lastRunAt={lastRunAt}
    />
  );
}
