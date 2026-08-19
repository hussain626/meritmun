import type { Metadata } from "next";
import { CommitteeFilters } from "@/components/committees/CommitteeFilters";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/ui/Section";
import { committees } from "@/content/committees";

export const metadata: Metadata = {
  title: "Committees",
  description:
    "The twelve MERITMUN III committees — General Assembly, specialised, crisis and press — each running a single researched agenda. Filter by committee type and difficulty before you rank your three preferences.",
};

export default function CommitteesPage() {
  return (
    <main id="content">
      <PageHero
        title="Committees"
        lead="Twelve committees, each running one researched agenda for the full three days. Read them, then rank three preferences when you register — allocation weights your first choice most heavily."
      />
      <Section>
        <CommitteeFilters committees={committees} />
      </Section>
    </main>
  );
}
