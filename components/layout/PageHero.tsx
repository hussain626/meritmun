import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  title: string;
  lead?: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * The interior-page counterpart to the home hero. Owns the --header-h top
 * offset that every page's first section must carry, because the site header
 * is pulled out of flow with a negative margin.
 */
export function PageHero({ title, lead, meta, action, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-line bg-canvas-subtle",
        "pt-[calc(var(--header-h)+3.5rem)] pb-14 sm:pb-16",
        className,
      )}
    >
      {/* A single quiet meridian arc — orients the page as part of the
          conference without becoming decoration for its own sake. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 600 400"
        preserveAspectRatio="xMaxYMid slice"
        className="pointer-events-none absolute -top-16 -right-24 h-[130%] w-[46rem] text-brand opacity-[0.13]"
      >
        <g fill="none" stroke="currentColor" strokeWidth={1.25}>
          <circle cx="380" cy="200" r="150" />
          <circle cx="380" cy="200" r="110" />
          <ellipse cx="380" cy="200" rx="62" ry="150" />
          <ellipse cx="380" cy="200" rx="118" ry="150" />
          <path d="M230 155h300M230 200h300M230 245h300" />
        </g>
      </svg>

      <div className="container-page relative">
        <div className="max-w-[46ch]">
          <h1 className="font-display text-h1 text-fg">{title}</h1>
          {lead ? (
            <p className="mt-5 max-w-[56ch] text-lg leading-normal text-fg-muted">
              {lead}
            </p>
          ) : null}
          {meta ? <div className="mt-6">{meta}</div> : null}
          {action ? <div className="mt-8">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
