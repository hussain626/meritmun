import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/auth";
import { getOverviewKpis } from "@/lib/admin/data";
import { AdminChrome } from "./AdminChrome";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();
  const kpis = await getOverviewKpis();

  return (
    <AdminChrome
      role={session.role}
      userName={session.user.fullName}
      alertCount={kpis.openQueries}
    >
      {children}
    </AdminChrome>
  );
}
