import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ACADEMIC_ROLES } from "@/lib/admin/types";
import { listCommitteesAdmin, listPortfolios } from "@/lib/admin/data";
import { CommitteesClient } from "./CommitteesClient";

export const metadata: Metadata = {
  title: "Committees",
  robots: { index: false, follow: false },
};

export default async function CommitteesAdminPage() {
  await requireAdminSession(ACADEMIC_ROLES);
  const [committees, portfolios] = await Promise.all([
    listCommitteesAdmin(),
    listPortfolios(),
  ]);

  return <CommitteesClient committees={committees} portfolios={portfolios} />;
}
