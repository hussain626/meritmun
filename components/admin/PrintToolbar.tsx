"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/** Screen-only toolbar above a printable sheet. Hidden on paper. */
export function PrintToolbar({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-6 py-3 print:hidden">
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <Button size="sm" onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </div>
  );
}
