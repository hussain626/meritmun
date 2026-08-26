import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listEbMembers } from "@/lib/admin/data";
import { EbClient } from "./EbClient";

export const metadata: Metadata = {
  title: "Executive Board",
  robots: { index: false, follow: false },
};

export default async function EbAdminPage() {
  await requireAdminSession(["admin", "eb"]);
  const members = await listEbMembers();
  return <EbClient members={members} />;
}
