import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listFinanceRows, summarise } from "@/lib/admin/finances";
import { FinancesClient } from "./FinancesClient";

export const metadata: Metadata = {
  title: "Finances",
  robots: { index: false, follow: false },
};

export default async function FinancesPage() {
  await requireAdminSession(["admin", "eb", "reviewer"]);
  const rows = await listFinanceRows();
  return <FinancesClient rows={rows} summary={summarise(rows)} />;
}
