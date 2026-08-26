"use client";

import { ChevronLeft } from "@/components/icons/ChevronLeft";
import { ChevronRight } from "@/components/icons/ChevronRight";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun?: string;
  className?: string;
};

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  noun = "entries",
  className,
}: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).slice(
    0,
    Math.min(pageCount, 5),
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3",
        className,
      )}
    >
      <p className="text-sm text-fg-muted">
        Showing {from} to {to} of {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            "grid size-8 place-items-center rounded-sm border border-line text-fg-muted",
            "transition-colors duration-[var(--dur-fast)]",
            "hover:bg-surface-inset hover:text-fg",
            "disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPageChange(n)}
            className={cn(
              "grid size-8 place-items-center rounded-sm text-sm font-medium",
              "transition-colors duration-[var(--dur-fast)]",
              "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
              n === page
                ? "bg-brand text-on-brand"
                : "border border-line text-fg-muted hover:bg-surface-inset hover:text-fg",
            )}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            "grid size-8 place-items-center rounded-sm border border-line text-fg-muted",
            "transition-colors duration-[var(--dur-fast)]",
            "hover:bg-surface-inset hover:text-fg",
            "disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
