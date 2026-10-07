import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/auth";

/**
 * Bare layout for printable sheets (roll call, waivers): no admin chrome,
 * always black on white so the paper copy matches the screen.
 */
export default async function AdminPrintLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminSession();
  return (
    <div className="min-h-screen bg-white text-neutral-900 print:min-h-0">
      {children}
    </div>
  );
}
