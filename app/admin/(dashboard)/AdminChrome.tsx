"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import type { AdminRole } from "@/lib/admin/types";
import { signOutAdmin } from "@/lib/admin/actions";

type AdminChromeProps = {
  role: AdminRole;
  userName: string;
  alertCount?: number;
  children: ReactNode;
};

export function AdminChrome({
  role,
  userName,
  alertCount = 0,
  children,
}: AdminChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOutAdmin();
      router.refresh();
    });
  }

  return (
    <div
      data-admin-root
      className="fixed inset-0 z-[100] flex bg-canvas text-fg"
    >
      <AdminSidebar
        role={role}
        userName={userName}
        onSignOut={handleSignOut}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <AdminTopbar alertCount={alertCount} />
        <main
          key={pathname}
          className="min-h-0 flex-1 overflow-y-auto bg-canvas px-4 py-5 sm:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
