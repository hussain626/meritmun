import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  listAllotments,
  listCommitteesAdmin,
  listDelegates,
  listPortfolios,
} from "@/lib/admin/data";
import { AllotmentsClient, type AllotmentRow } from "./AllotmentsClient";

export const metadata: Metadata = {
  title: "Allotments",
  robots: { index: false, follow: false },
};

export default async function AllotmentsPage() {
  const session = await requireAdminSession();
  const [allotments, delegates, committees, portfolios] = await Promise.all([
    listAllotments(),
    listDelegates(),
    listCommitteesAdmin(),
    listPortfolios(),
  ]);

  const delegateMap = new Map(delegates.map((d) => [d.id, d]));
  const committeeMap = new Map(committees.map((c) => [c.id, c]));
  const portfolioMap = new Map(portfolios.map((p) => [p.id, p]));

  const rows: AllotmentRow[] = allotments.map((a) => {
    const portfolio = portfolioMap.get(a.portfolioId);
    const delegate = delegateMap.get(a.delegateId);
    return {
      ...a,
      delegateName: delegate?.fullName ?? a.delegateId,
      committeeName:
        committeeMap.get(a.committeeId)?.abbr ??
        committeeMap.get(a.committeeId)?.name ??
        a.committeeId,
      countryName: portfolio?.countryName ?? "—",
      isP5: portfolio?.isP5 ?? false,
      inDelegation: Boolean(delegate?.delegationId),
    };
  });

  const allottedIds = new Set(allotments.map((a) => a.delegateId));
  const paidDelegates = delegates.filter((d) => d.paymentStatus === "confirmed");
  const failureCount = paidDelegates.filter((d) => !allottedIds.has(d.id)).length;
  const lastRunAt =
    allotments
      .filter((a) => a.source === "merit")
      .map((a) => a.createdAt)
      .sort()
      .at(-1) ?? null;

  return (
    <AllotmentsClient
      rows={rows}
      committees={committees}
      portfolios={portfolios}
      role={session.role}
      lastRunAt={lastRunAt}
      failureCount={failureCount}
      totalSlots={paidDelegates.length || allotments.length}
    />
  );
}
