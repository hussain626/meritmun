import { ArrowRight } from "@/components/icons/ArrowRight";
import { FlagArray } from "@/components/home/FlagArray";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import { StatsBar } from "@/components/home/StatsBar";
import { ButtonLink } from "@/components/ui/Button";
import type { Stat } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

type HeroProps = {
  stats: Stat[];
  city: string;
  datesLabel: string;
  committeeCount: number;
  seatCount: number;
  registrationOpen: boolean;
};

export function Hero({
  stats,
  city,
  datesLabel,
  committeeCount,
  seatCount,
  registrationOpen,
}: HeroProps) {
  return (
    <section className="relative">
      <div className="relative min-h-[var(--hero-min-h)] overflow-hidden">
        <HeroBackdrop />
        <FlagArray />

        <div className="relative container-page grid min-h-[var(--hero-min-h)] place-items-center pt-[calc(var(--chrome-h)+2.5rem)] pb-44 lg:pb-40">
          {/* The pitch, centred under the dome. Staggered rather than risen as
              one block: this is a single ordered sequence (label → name → offer
              → action), which is what a stagger is for. The global
              reduced-motion reset collapses every delay to zero, so the
              fallback is the final state instantly. */}
          <div className="flex max-w-[48rem] flex-col items-center text-center stagger-children">
            <p className="animate-rise text-xs font-semibold tracking-caps text-on-art-accent uppercase sm:text-sm">
              Discover the world of diplomacy with
            </p>
            {/* Always one line. The name runs about 7.6em wide, so on phones the
                size is capped by the viewport (less the gutters, with a little
                slack) instead of letting it wrap. */}
            <h1 className="mt-4 animate-rise font-display text-display text-[min(var(--text-display),calc((100vw-2*var(--gutter))/7.9))] font-bold text-nowrap text-on-art uppercase">
              Meritmun <span className="text-on-art-accent">III</span>
            </h1>
            <p className="mt-5 max-w-[38ch] animate-rise text-lg leading-snug text-on-art-muted sm:text-xl">
              {committeeCount} committees. Three days in {city}.
              <br className="hidden sm:inline" /> {formatNumber(seatCount)} seats, and
              one of them is yours.
            </p>

            <div className="mt-9 flex animate-rise flex-col items-center gap-5 sm:flex-row">
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
            </div>

            <p className="mt-7 animate-rise text-xs tracking-wide text-on-art-muted/80 uppercase">
              {datesLabel}
            </p>
          </div>
        </div>
      </div>

      {/* The floating stats bar, overlapping the hero base */}
      <div className="container-page relative z-[var(--z-raised)] -mt-32 sm:-mt-28">
        <StatsBar stats={stats} />
      </div>
    </section>
  );
}
