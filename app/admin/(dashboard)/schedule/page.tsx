import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listScheduleDays } from "@/lib/admin/data";
import { ScheduleClient } from "./ScheduleClient";

export const metadata: Metadata = {
  title: "Schedule",
  robots: { index: false, follow: false },
};

export default async function AdminSchedulePage() {
  await requireAdminSession(["admin", "eb"]);
  const days = await listScheduleDays();
  return <ScheduleClient days={days} />;
}
