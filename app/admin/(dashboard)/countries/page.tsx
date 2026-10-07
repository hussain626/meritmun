import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  listAllotments,
  listAttendance,
  listCommitteesAdmin,
  listDelegates,
  listDelegations,
  listPortfolios,
  listScheduleDays,
} from "@/lib/admin/data";
import { buildSeatMatrix } from "@/lib/admin/seat-matrix";
import { CountriesClient } from "./CountriesClient";

export const metadata: Metadata = {
  title: "Country Matrix",
  robots: { index: false, follow: false },
};

export default async function CountriesPage() {
  const session = await requireAdminSession();
  const [committees, portfolios, allotments, delegates, delegations, days, attendance] =
    await Promise.all([
      listCommitteesAdmin(),
      listPortfolios(),
      listAllotments(),
      listDelegates(),
      listDelegations(),
      listScheduleDays(),
      listAttendance(),
    ]);

  const matrix = buildSeatMatrix({
    committees,
    portfolios,
    allotments,
    delegates,
    delegations,
  });

  return (
    <CountriesClient
      matrix={matrix}
      days={days.map((d) => ({ id: d.id, label: d.label }))}
      attendance={attendance.map((a) => `${a.delegateId}:${a.dayId}`)}
      role={session.role}
    />
  );
}
