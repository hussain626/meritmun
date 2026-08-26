"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type SponsorSlide = {
  id: string;
  name: string;
  logoUrl: string;
  url: string;
};

type SponsorSliderProps = {
  sponsors: SponsorSlide[];
  className?: string;
};

/**
 * Continuous logo band for the home page (below hero). Logos only — no cards.
 * Duplicates the row for a seamless marquee; pauses on hover / focus-within.
 */
export function SponsorSlider({ sponsors, className }: SponsorSliderProps) {
  const [paused, setPaused] = useState(false);

  if (sponsors.length === 0) return null;

  const track = [...sponsors, ...sponsors];

  return (
    <section
      aria-label="Sponsors"
      className={cn(
        "border-y border-line bg-surface-inset py-8 sm:py-10",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="overflow-hidden">
        <ul
          className={cn(
            "flex w-max items-center gap-10 sm:gap-14",
            "animate-sponsor-marquee",
            paused && "[animation-play-state:paused]",
            "motion-reduce:animate-none",
          )}
        >
          {track.map((sponsor, index) => (
            <li
              key={`${sponsor.id}-${index}`}
              aria-hidden={index >= sponsors.length ? true : undefined}
              className="shrink-0"
            >
              <a
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={index >= sponsors.length ? -1 : undefined}
                className={cn(
                  "group inline-flex h-12 items-center justify-center sm:h-14",
                  "opacity-70 transition-[opacity,transform] duration-[var(--dur-fast)] ease-out",
                  "hover:opacity-100 focus-visible:opacity-100",
                  "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-4",
                )}
              >
                {sponsor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote sponsor URLs vary by storage host
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    width={160}
                    height={56}
                    className="h-10 w-auto max-w-[9rem] object-contain sm:h-12 sm:max-w-[11rem]"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="px-2 font-display text-lg tracking-tight text-fg-muted group-hover:text-fg sm:text-xl">
                    {sponsor.name}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
