import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { listCommitteesAdmin, listPortfolios } from "@/lib/admin/data";
import { CommitteeDetailClient } from "./CommitteeDetailClient";

export const metadata: Metadata = {
  title: "Committee detail",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CommitteeDetailPage({ params }: PageProps) {
  const session = await requireAdminSession(["admin", "eb"]);
  const { id } = await params;
  const [committees, portfolios] = await Promise.all([
    listCommitteesAdmin(),
    listPortfolios(),
  ]);

  const committee = committees.find((c) => c.id === id);
  if (!committee) notFound();

  const committeePortfolios = portfolios
    .filter((p) => p.committeeId === id)
    .sort((a, b) => a.countryName.localeCompare(b.countryName));

  return (
    <CommitteeDetailClient
      committee={committee}
      portfolios={committeePortfolios}
      role={session.role}
    />
  );
}
