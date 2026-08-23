import Link from "next/link";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { DelegateCollage } from "@/components/home/DelegateCollage";
import { FlagArray } from "@/components/home/FlagArray";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { StatsBar } from "@/components/home/StatsBar";
import { ButtonLink } from "@/components/ui/Button";
import { registrationOpen } from "@/content/site";
import type { Stat } from "@/lib/types";

type HeroProps = {
  stats: Stat[];
  city: string;
  datesLabel: string;
  committeeCount: number;
};

export function Hero({ stats, city, datesLabel, committeeCount }: HeroProps) {
  return (
    <section className="relative">
      <div className="relative min-h-[var(--hero-min-h)] overflow-hidden">
        <HeroBackdrop />
        <FlagArray />

        <div className="relative container-page grid min-h-[var(--hero-min-h)] items-center gap-8 pt-[calc(var(--header-h)+2.5rem)] pb-44 lg:grid-cols-[7fr_5fr] lg:gap-4 lg:pb-40">
          {/* Left — the pitch. Staggered rather than risen as one block: this is
              a single ordered sequence (label → name → offer → action), which is
              what a stagger is for. The global reduced-motion reset collapses
              every delay to zero, so the fallback is the final state instantly. */}
          <div className="max-w-[38rem] stagger-children">
            <p className="animate-rise text-xs font-semibold tracking-caps text-on-art-accent uppercase sm:text-sm">
              Discover the world of diplomacy with
            </p>
            {/* nowrap only from sm up — below that the display size would
                overflow the viewport rather than wrap. */}
            <h1 className="mt-4 animate-rise font-display text-display font-extrabold text-on-art sm:text-nowrap">
              MERITMUN <span className="text-on-art-accent">III</span>
            </h1>
            <p className="mt-5 max-w-[34ch] animate-rise text-lg leading-snug text-on-art-muted">
              {committeeCount} committees. Three days in {city}.
              <br className="hidden sm:inline" /> Six hundred seats, and one of
              them is yours.
            </p>

            <div className="mt-9 flex animate-rise flex-col items-start gap-5 sm:flex-row sm:items-center">
              {registrationOpen ? (
                <ButtonLink href="/register/delegate" size="lg">
                  Register now
                  <ArrowRight className="size-5" />
                </ButtonLink>
              ) : (
                <ButtonLink href="/register" size="lg" variant="secondary">
                  Registration coming soon
                </ButtonLink>
              )}

              <p className="text-sm text-on-art-muted">
                Already applied?{" "}
                <Link
                  href="/register/status"
                  className="font-semibold text-on-art underline decoration-on-art-accent decoration-2 underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-on-art-accent focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                >
                  Check your status
                </Link>
              </p>
            </div>

            <p className="mt-7 animate-rise text-xs tracking-wide text-on-art-muted/80 uppercase">
              {datesLabel}
            </p>
          </div>

          {/* Right — the collage. Absolutely placed so it can run past the
              grid's bottom padding to the banner floor and stand in front of
              the flag row, with its hard crop edge clipped by the overflow.
              Hidden below lg, where it would crowd the copy rather than
              support it; the backdrop and flags carry the visual there. */}
          <DelegateCollage className="pointer-events-none absolute -bottom-6 right-[var(--gutter)] hidden w-[50%] max-w-[660px] lg:block" />
        </div>
      </div>

      {/* The floating stats bar, overlapping the hero base */}
      <div className="container-page relative z-[var(--z-raised)] -mt-32 sm:-mt-28">
        <StatsBar stats={stats} />
      </div>
    </section>
  );
}
