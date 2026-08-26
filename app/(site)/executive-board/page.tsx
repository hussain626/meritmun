import type { Metadata } from "next";
import { BoardMemberCard } from "@/components/board/BoardMemberCard";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { directorate, secretariat } from "@/content/board";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "EB",
  description:
    "The EB and HODs running MERITMUN III — who holds which portfolio, and which address reaches them.",
};

/** Board `1 / 2 / 4`, per the grid rule in `context/ui-rules.md`. */
const boardGrid = "grid gap-5 stagger-children md:grid-cols-2 lg:grid-cols-4";

export default function ExecutiveBoardPage() {
  return (
    <main id="content">
      <PageHero
        title="EB"
        lead="Fourteen people run MERITMUN III. These are the ones who answer your email, and the addresses below reach them directly."
      />

      <Section>
        <SectionHeading
          title="EB"
          lead="Eight officers who own the academic standard, the schedule, and the money. Each one holds a single portfolio and is accountable for it."
        />

        <div className={cn("mt-10", boardGrid)}>
          {secretariat.map((member) => {
            const isSecretaryGeneral = member.id === "sg";

            return (
              <div
                key={member.id}
                className={cn(
                  "animate-rise",
                  isSecretaryGeneral && "md:col-span-2 lg:col-span-2",
                )}
              >
                <BoardMemberCard
                  member={member}
                  featured={isSecretaryGeneral}
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section band="subtle">
        <SectionHeading
          title="HODs"
          lead="Six heads of department running crisis, press, delegate training, technology, design, and hospitality. They work through the EB inbox rather than their own, so write to the portfolio above that fits your question."
        />

        <div className={cn("mt-10", boardGrid)}>
          {directorate.map((member) => (
            <div key={member.id} className="animate-rise">
              <BoardMemberCard member={member} />
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
