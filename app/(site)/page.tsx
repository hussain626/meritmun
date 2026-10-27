import { ArrowRight } from "@/components/icons/ArrowRight";
import { CommitteeCard } from "@/components/committees/CommitteeCard";
import { Hero } from "@/components/home/Hero";
import { HomeCta } from "@/components/home/HomeCta";
import { SponsorSlider } from "@/components/home/SponsorSlider";
import { ValueProp } from "@/components/home/ValueProp";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { conference, valueProps } from "@/content/site";
import { heroStats } from "@/content/stats";
import { getRegistrationOpen } from "@/lib/admin/data";
import {
  getPublicPricing,
  listPublicCommittees,
  listPublicSponsors,
} from "@/lib/public/data";
import { formatNumber } from "@/lib/utils";

export default async function HomePage() {
  const [registrationOpen, activeSponsors, committees, pricing] =
    await Promise.all([
      getRegistrationOpen(),
      listPublicSponsors(),
      listPublicCommittees(),
      // The homepage must render even if pricing cannot be read; the fee line
      // is simply left off.
      getPublicPricing().catch(() => null),
    ]);
  const seatCount = committees.reduce((sum, c) => sum + c.seats, 0);
  const featured = committees.filter((c) => c.featured);
  const featuredCommittees = (featured.length > 0 ? featured : committees).slice(0, 3);

  return (
    <main id="content">
      <Hero
        stats={heroStats.map((stat) =>
          stat.id === "committees" ? { ...stat, value: committees.length } : stat,
        )}
        city={conference.city}
        datesLabel={conference.datesLabel}
        committeeCount={committees.length}
        seatCount={seatCount}
        registrationOpen={registrationOpen}
      />

      <ValueProp points={valueProps} />

      {activeSponsors.length > 0 ? (
        <div className="animate-rise">
          <p className="sr-only">Sponsors</p>
          <SponsorSlider sponsors={activeSponsors} />
        </div>
      ) : null}

      <Section band="subtle">
        <SectionHeading
          title="Where you might end up"
          lead={`${committees.length} committees, each with one researched agenda. ${featuredCommittees.length < committees.length ? `${featuredCommittees.length} of them, to give you the range.` : ""}`}
          action={
            <ButtonLink href="/committees" variant="outline">
              See all {committees.length}
              <ArrowRight className="size-4" />
            </ButtonLink>
          }
        />
        <div className="mt-10 grid gap-5 stagger-children sm:grid-cols-2 lg:grid-cols-3">
          {featuredCommittees.map((committee) => (
            <CommitteeCard
              key={committee.slug}
              committee={committee}
              className="animate-rise"
            />
          ))}
        </div>
      </Section>

      <HomeCta
        delegateFee={
          pricing
            ? `${pricing.currency} ${formatNumber(pricing.delegate)}`
            : null
        }
        delegationFee={
          pricing
            ? `${pricing.currency} ${formatNumber(pricing.perDelegate)} per head${pricing.delegationFlat > 0 ? ` + ${pricing.currency} ${formatNumber(pricing.delegationFlat)} per delegation` : ""}`
            : null
        }
        registrationOpen={registrationOpen}
      />
    </main>
  );
}
