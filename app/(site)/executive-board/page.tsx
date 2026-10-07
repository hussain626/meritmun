import type { Metadata } from "next";
import { BoardMemberCard } from "@/components/board/BoardMemberCard";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPublicBoard } from "@/lib/public/data";
import { cn, pluralise } from "@/lib/utils";

export const metadata: Metadata = {
  title: "EB",
  description:
    "The EB and HODs running MERITMUN III — who holds which portfolio, and which address reaches them.",
};

/** Board `1 / 2 / 4`, per the grid rule in `context/ui-rules.md`. */
const boardGrid = "grid gap-5 stagger-children md:grid-cols-2 lg:grid-cols-4";

export default async function ExecutiveBoardPage() {
  const { secretariat, directorate } = await listPublicBoard();
  const total = secretariat.length + directorate.length;

  return (
    <main id="content">
      <PageHero
        title="EB"
        lead={`${total} ${pluralise(total, "person", "people")} run MERITMUN III. These are the ones who answer your email, and the addresses below reach them directly.`}
      />

      {secretariat.length > 0 ? (
        <Section>
          <p className="max-w-[54ch] text-lg leading-normal text-fg-muted">
            {secretariat.length} {pluralise(secretariat.length, "officer", "officers")} who
            own the academic standard, the schedule, and the money. Each one holds a
            single portfolio and is accountable for it.
          </p>

          <div className={cn("mt-10", boardGrid)}>
            {secretariat.map((member, index) => {
              // First in the admin sort order leads the page (the Secretary-General).
              const featured = index === 0;

              return (
                <div
                  key={member.id}
                  className={cn(
                    "animate-rise",
                    featured && "md:col-span-2 lg:col-span-2",
                  )}
                >
                  <BoardMemberCard member={member} featured={featured} />
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {directorate.length > 0 ? (
        <Section band="subtle">
          <SectionHeading
            title="HODs"
            lead={`${directorate.length} ${pluralise(directorate.length, "head", "heads")} of department. They work through the EB inbox rather than their own, so write to the portfolio above that fits your question.`}
          />

          <div className={cn("mt-10", boardGrid)}>
            {directorate.map((member) => (
              <div key={member.id} className="animate-rise">
                <BoardMemberCard member={member} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </main>
  );
}
