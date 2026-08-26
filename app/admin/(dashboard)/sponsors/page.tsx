import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listSponsors } from "@/lib/admin/data";
import { SponsorsClient } from "./SponsorsClient";

export const metadata: Metadata = {
  title: "Sponsors",
  robots: { index: false, follow: false },
};

export default async function SponsorsAdminPage() {
  await requireAdminSession(["admin", "eb"]);
  const sponsors = await listSponsors();
  return <SponsorsClient sponsors={sponsors} />;
}
