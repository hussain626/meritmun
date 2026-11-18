import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/auth";
import { getOverviewKpis } from "@/lib/admin/data";
import { ADMIN_ROLES } from "@/lib/admin/types";
import { AdminChrome } from "./AdminChrome";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Every role gets the chrome; each page then gates itself.
  const session = await requireAdminSession(ADMIN_ROLES);
  // The alert bell counts open queries, which academics cannot see.
  const openQueries =
    session.role === "academics" ? 0 : (await getOverviewKpis()).openQueries;

  return (
    <AdminChrome
      role={session.role}
      userName={session.user.fullName}
      alertCount={openQueries}
    >
      {children}
    </AdminChrome>
  );
}
