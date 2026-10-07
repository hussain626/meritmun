import { ArrowRight } from "@/components/icons/ArrowRight";
import { CommitteeCard } from "@/components/committees/CommitteeCard";
import { Aftermovie } from "@/components/home/Aftermovie";
import { Hero } from "@/components/home/Hero";
import { HomeCta } from "@/components/home/HomeCta";
import { SponsorSlider } from "@/components/home/SponsorSlider";
import { ValueProp } from "@/components/home/ValueProp";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { aftermovie, conference, valueProps } from "@/content/site";
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
      getPublicPricing(),
    ]);
  const featured = committees.filter((c) => c.featured);
  const featuredCommittees = (featured.length > 0 ? featured : committees).slice(0, 3);

  return (
    <main id="content">
      <Hero
        stats={heroStats}
        city={conference.city}
        datesLabel={conference.datesLabel}
        committeeCount={committees.length}
        registrationOpen={registrationOpen}
      />

      <ValueProp points={valueProps} />

      {activeSponsors.length > 0 ? (
        <div className="animate-rise">
          <p className="sr-only">Sponsors</p>
          <SponsorSlider sponsors={activeSponsors} />
        </div>
      ) : null}

      <Section>
        <SectionHeading
          title="MERITMUN II, in three minutes"
          lead="Three days, forty-one institutions, and one very long final General Assembly session."
        />
        <div className="mt-10">
          <Aftermovie
            title={aftermovie.title}
            description={aftermovie.description}
            duration={aftermovie.duration}
            src={aftermovie.src}
            chapters={aftermovie.chapters}
          />
        </div>
      </Section>

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
        delegateFee={`${pricing.currency} ${formatNumber(pricing.delegate)}`}
        delegationFee={`${pricing.currency} ${formatNumber(pricing.perDelegate)} per head`}
        registrationOpen={registrationOpen}
      />
    </main>
  );
}
