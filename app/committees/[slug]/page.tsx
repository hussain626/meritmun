import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CommitteeDetail } from "@/components/committees/CommitteeDetail";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/ui/Section";
import { committees, getCommitteeBySlug } from "@/content/committees";

export function generateStaticParams() {
  return committees.map((committee) => ({ slug: committee.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/committees/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const committee = getCommitteeBySlug(slug);

  if (!committee) {
    return { title: "Committee not found" };
  }

  return {
    title: `${committee.abbr} — ${committee.name}`,
    description: committee.agenda,
  };
}

export default async function CommitteePage({
  params,
}: PageProps<"/committees/[slug]">) {
  const { slug } = await params;
  const committee = getCommitteeBySlug(slug);

  if (!committee) {
    notFound();
  }

  return (
    <main id="content">
      {/* No lead here: the overview is the detail body's opening paragraph, and
          repeating it under the title would say the same thing twice. */}
      <PageHero
        title={committee.name}
        meta={
          <p className="font-display text-h3 font-bold tracking-tight text-brand-fg">
            {committee.abbr}
          </p>
        }
      />
      <Section>
        <CommitteeDetail committee={committee} />
      </Section>
    </main>
  );
}
