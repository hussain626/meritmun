import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProseProps = {
  className?: string;
  children: ReactNode;
};

/** Typographic wrapper for long-form copy. Capped at --measure for readability. */
export function Prose({ className, children }: ProseProps) {
  return (
    <div
      className={cn(
        "max-w-[var(--measure)] text-fg-muted",
        "[&_p]:mb-5 [&_p]:leading-relaxed [&_p:last-child]:mb-0",
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-h2 [&_h2]:text-fg",
        "[&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-h3 [&_h3]:text-fg",
        "[&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0",
        "[&_ul]:mb-5 [&_ul]:space-y-2.5 [&_ul]:pl-5",
        "[&_li]:list-disc [&_li]:leading-relaxed [&_li]:marker:text-brand-fg",
        "[&_strong]:font-semibold [&_strong]:text-fg",
        "[&_a]:font-medium [&_a]:text-brand-fg [&_a]:underline [&_a]:underline-offset-4",
        "[&_a:hover]:text-accent-fg",
        className,
      )}
    >
      {children}
    </div>
  );
}
