import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listCommitteesAdmin, listPortfolios } from "@/lib/admin/data";
import { CommitteesClient } from "./CommitteesClient";

export const metadata: Metadata = {
  title: "Committees",
  robots: { index: false, follow: false },
};

export default async function CommitteesAdminPage() {
  await requireAdminSession(["admin", "eb"]);
  const [committees, portfolios] = await Promise.all([
    listCommitteesAdmin(),
    listPortfolios(),
  ]);

  return <CommitteesClient committees={committees} portfolios={portfolios} />;
}
