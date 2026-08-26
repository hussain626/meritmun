import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

/** Filter strip for dense ops tables. */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-sm bg-surface-inset px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
