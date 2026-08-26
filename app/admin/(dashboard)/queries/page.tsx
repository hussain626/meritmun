import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listQueries } from "@/lib/admin/data";
import { QueriesClient } from "./QueriesClient";

export const metadata: Metadata = {
  title: "Queries",
  robots: { index: false, follow: false },
};

export default async function QueriesPage() {
  const session = await requireAdminSession(["admin", "eb"]);
  const queries = await listQueries();

  return <QueriesClient queries={queries} role={session.role} />;
}
