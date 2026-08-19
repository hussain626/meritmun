import { ArrowRight } from "@/components/icons/ArrowRight";
import { CommitteeCard } from "@/components/committees/CommitteeCard";
import { Aftermovie } from "@/components/home/Aftermovie";
import { Hero } from "@/components/home/Hero";
import { HomeCta } from "@/components/home/HomeCta";
import { ValueProp } from "@/components/home/ValueProp";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { featuredCommittees } from "@/content/committees";
import { aftermovie, conference, pricing, valueProps } from "@/content/site";
import { heroStats } from "@/content/stats";
import { formatNumber } from "@/lib/utils";

export default function HomePage() {
  return (
    <main id="content">
      <Hero
        stats={heroStats}
        city={conference.city}
        datesLabel={conference.datesLabel}
        committeeCount={conference.committeeCount}
      />

      <ValueProp points={valueProps} />

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
          lead="Twelve committees, each with one researched agenda. Three of them, to give you the range."
          action={
            <ButtonLink href="/committees" variant="outline">
              See all twelve
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
        delegationFee={`From ${pricing.currency} ${formatNumber(pricing.delegationLarge)} per head`}
      />
    </main>
  );
}
