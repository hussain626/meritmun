import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** "mark" renders the glyph alone — used in the mobile header and the footer. */
  variant?: "full" | "mark";
  className?: string;
};

/**
 * The MERITMUN III lockup. The glyph is a meridian globe inside a chamber
 * arch — the two ideas the conference is selling — with a gold marker at the
 * apex standing in for the rostrum.
 */
export function Wordmark({ variant = "full", className }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M16 1.5c6 0 10.5 4.2 10.5 10.2v17.3a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V11.7C5.5 5.7 10 1.5 16 1.5Z"
          className="fill-brand"
        />
        <g
          className="stroke-on-brand"
          fill="none"
          strokeWidth={1.3}
          strokeLinecap="round"
        >
          <circle cx="16" cy="15.5" r="7" opacity={0.9} />
          <path d="M16 8.5v14" opacity={0.65} />
          <ellipse cx="16" cy="15.5" rx="3.1" ry="7" opacity={0.65} />
          <path d="M9.4 12.6h13.2M9.4 18.4h13.2" opacity={0.65} />
        </g>
        <circle cx="16" cy="5.6" r="1.9" className="fill-accent" />
      </svg>
      {variant === "full" ? (
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="font-display text-[1.35rem] font-bold tracking-tight text-fg">
            MERITMUN
          </span>
          <span className="font-display text-[1.35rem] font-bold tracking-tight text-accent-fg">
            III
          </span>
        </span>
      ) : null}
    </span>
  );
}
