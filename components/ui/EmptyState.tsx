import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  /** What happened, why, what to do next — three short sentences maximum. */
  body: string;
  action?: ReactNode;
  glyph?: ReactNode;
  className?: string;
};

/** Default glyph: an empty committee placard. Domain-specific, not a generic box. */
function PlacardGlyph() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-12 text-fg-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="8" y="10" width="32" height="20" rx="2" />
      <path d="M24 30v10" />
      <path d="M17 40h14" />
      <path d="M15 18h12" opacity={0.5} />
      <path d="M15 23h8" opacity={0.5} />
    </svg>
  );
}

export function EmptyState({
  title,
  body,
  action,
  glyph,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-md border border-dashed border-line px-6 py-14 text-center",
        className,
      )}
    >
      {glyph ?? <PlacardGlyph />}
      <div className="max-w-[42ch]">
        <p className="text-h3 text-fg">{title}</p>
        <p className="mt-2 text-sm leading-normal text-fg-muted">{body}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
