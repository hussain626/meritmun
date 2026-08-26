import type { Metadata } from "next";
import { OverviewClient } from "./OverviewClient";
import {
  ANNOUNCEMENT_SITE_PAGES,
  type AnnouncementPageOption,
} from "@/lib/admin/announcement";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getAnnouncementSettings,
  getOverviewKpis,
  listCommitteesAdmin,
  listDelegates,
  listDelegations,
} from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "Admin overview",
  robots: { index: false, follow: false },
};

export default async function AdminOverviewPage() {
  const session = await requireAdminSession();
  const [kpis, delegates, delegations, announcement, committees] =
    await Promise.all([
      getOverviewKpis(),
      listDelegates(),
      listDelegations(),
      getAnnouncementSettings(),
      listCommitteesAdmin(),
    ]);

  const pages: AnnouncementPageOption[] = [
    ...ANNOUNCEMENT_SITE_PAGES,
    ...committees
      .filter((committee) => committee.isPublished)
      .map((committee) => ({
        label: `${committee.abbr} — ${committee.name}`,
        path: `/committees/${committee.slug}`,
      })),
  ];

  if (
    announcement.internalPath &&
    !pages.some((page) => page.path === announcement.internalPath)
  ) {
    pages.push({
      label: announcement.internalPath,
      path: announcement.internalPath,
    });
  }

  return (
    <OverviewClient
      kpis={kpis}
      delegates={delegates}
      delegations={delegations}
      announcement={announcement}
      pages={pages}
      role={session.role}
    />
  );
}
