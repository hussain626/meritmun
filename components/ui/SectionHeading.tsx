import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: ReactNode;
  lead?: ReactNode;
  /**
   * Small-caps label above the heading. Budgeted to THREE uses site-wide, where
   * it does real navigational work — see the eyebrow ban in `ui-rules.md`.
   * Spent on: the hero sub-headline, committee detail meta, schedule day marker.
   */
  eyebrow?: string;
  action?: ReactNode;
  align?: "start" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
};

export function SectionHeading({
  title,
  lead,
  eyebrow,
  action,
  align = "start",
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  const sizeClass =
    Tag === "h1" ? "text-h1 font-display" : Tag === "h2" ? "text-h2" : "text-h3";

  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[46ch]",
          align === "center" && "mx-auto text-center",
        )}
      >
        {eyebrow ? (
          <p className="mb-3 text-xs font-semibold tracking-caps text-brand-fg uppercase">
            {eyebrow}
          </p>
        ) : null}
        <Tag className={cn(sizeClass, "text-fg text-balance")}>{title}</Tag>
        {lead ? (
          <p className="mt-4 max-w-[54ch] text-lg leading-normal text-fg-muted">
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
