import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { PageHero } from "@/components/layout/PageHero";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Prose } from "@/components/ui/Prose";
import { Section } from "@/components/ui/Section";
import { conference } from "@/content/site";
import { heroStats } from "@/content/stats";
import { getRegistrationOpen } from "@/lib/admin/data";
import { listPublicCommittees } from "@/lib/public/data";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Model UN is, what MERITMUN is, and how MERITMUN III works, committees, allocation, and registration.",
};

/**
 * How the conference works, in terms the site itself guarantees. Every line
 * here must stay true of the product, no invented history or venue detail.
 */
const howItWorks = [
  {
    id: "committees",
    title: "One agenda per committee",
    body: "Each committee debates a single, published question for the full three days. The agenda and difficulty level of every committee are on the Committees page before you register, so you can choose, and prepare, properly.",
  },
  {
    id: "merit",
    title: "Seats allotted on merit",
    body: "You rank three committees when you register. Once your payment is confirmed, seats are matched against your preferences and your experience, and your committee and portfolio are emailed to you.",
  },
  {
    id: "beginners",
    title: "Open to first-timers",
    body: "No experience is needed to register. Every committee lists its difficulty, so you can pick one pitched at where you are.",
  },
  {
    id: "fees",
    title: "Clear fees, one payment",
    body: "The fee is shown before you register and quoted again in your confirmation email with the bank details. A delegation pays once for its whole roster.",
  },
] as const;

export default async function AboutPage() {
  const [registrationOpen, committees] = await Promise.all([
    getRegistrationOpen(),
    listPublicCommittees(),
  ]);
  const committeeCount = committees.length;
  const seatCount = committees.reduce((sum, c) => sum + c.seats, 0);
  const institutions = heroStats.find((stat) => stat.id === "institutions");
  const alumni = heroStats.find((stat) => stat.id === "alumni");

  const facts: { label: string; value: string; href?: string }[] = [
    { label: "Iteration", value: `${conference.name} ${conference.iteration}` },
    { label: "Host city", value: `${conference.city}, ${conference.country}` },
    { label: "Venue", value: conference.venue, href: conference.venueUrl },
    { label: "Dates", value: conference.datesLabel },
    { label: "Length", value: `${conference.durationDays} days` },
    { label: "Committees", value: String(committeeCount) },
    { label: "Delegate seats", value: formatNumber(seatCount) },
  ];

  return (
    <main id="content">
      <PageHero
        title={`About ${conference.fullName}`}
        lead={`${conference.longName}. ${committeeCount} committees, ${conference.durationDays} days, and ${formatNumber(seatCount)} seats in ${conference.city}.`}
      />

      <Section width="prose">
        <Prose>
          <h2>If you have not done this before</h2>
          <p>
            Model United Nations is a simulation of international negotiation.
            You are assigned a country and a committee, and for three days you
            argue that country&rsquo;s position on one specific question,
            whether or not you personally agree with it.
          </p>
          <p>
            The work is real work. You research a state you have probably never
            visited, write and defend a position, build a bloc with people who
            started the morning opposing you, and put your name on a resolution
            that has to survive a vote. The skills that come out of it (reading
            a brief quickly, speaking under time pressure, writing something
            other people will sign) are the reason schools keep
            sending delegations.
          </p>
          <p>
            <strong>
              You do not need experience to register for {conference.fullName}.
            </strong>{" "}
            Every committee lists its difficulty level, so you can choose one
            pitched at where you are.
          </p>

          <h2>What MERITMUN is</h2>
          <p>
            MERITMUN is the Meritorious Model United Nations conference. This is{" "}
            {conference.fullName}, the third iteration: {committeeCount}{" "}
            committees and {formatNumber(seatCount)} delegate seats across{" "}
            {conference.durationDays} days in {conference.city}.
          </p>
          <p>
            It is run by students. The committees are published with their
            agendas and difficulty levels before you pay anything, and if this
            site does not answer your question, the secretariat will, write to
            us from the Contact page.
          </p>
        </Prose>
      </Section>

      <Section band="subtle">
        <div className="grid gap-14 lg:grid-cols-[7fr_5fr] lg:gap-20">
          <div>
            <h2 className="text-h2 text-fg text-balance">
              How {conference.fullName} works
            </h2>

            <dl className="mt-10 divide-y divide-line border-t border-line">
              {howItWorks.map((item) => (
                <div key={item.id} className="py-7">
                  <dt className="text-base font-semibold text-fg text-balance">
                    {item.title}
                  </dt>
                  <dd className="mt-2.5 max-w-[58ch] leading-relaxed text-fg-muted">
                    {item.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--chrome-h)+3rem)] lg:self-start">
            <h3 className="text-h3 text-fg">The shape of it</h3>
            <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-6 py-3.5"
                >
                  <dt className="shrink-0 text-fg-faint">{fact.label}</dt>
                  <dd className="text-right font-medium text-fg">
                    {fact.href ? (
                      <a
                        href={fact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-fg underline underline-offset-4 hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                      >
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </Section>

      <Section width="prose">
        <Alert tone="info" title={conference.datesLabel} className="max-w-[70ch]">
          {conference.fullName} runs over three days at {conference.venue},{" "}
          {conference.city}. Confirmed delegates receive their committee,
          portfolio and background guide by email ahead of the first day.
        </Alert>
      </Section>

      {institutions || alumni ? (
        <Section>
          <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
            <div>
              <h2 className="text-h2 text-fg text-balance">
                The record so far
              </h2>
              <div className="mt-8 h-px w-24 bg-accent" />
            </div>

            <Prose>
              <p>
                So far,{" "}
                {institutions ? (
                  <strong>
                    {formatNumber(institutions.value)}
                    {institutions.suffix ?? ""} institutions
                  </strong>
                ) : null}
                {institutions && alumni ? " and " : null}
                {alumni ? (
                  <strong>
                    {formatNumber(alumni.value)}
                    {alumni.suffix ?? ""} delegates
                  </strong>
                ) : null}{" "}
                have taken part in MERITMUN.
              </p>
            </Prose>
          </div>
        </Section>
      ) : null}

      <Section band="forest">
        <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:items-end">
          <div>
            <h2 className="font-display text-h2 text-on-brand text-balance">
              {registrationOpen
                ? `Registration for ${conference.fullName} is open`
                : `Registration for ${conference.fullName} is coming soon`}
            </h2>
            <p className="mt-4 max-w-[52ch] leading-relaxed text-on-brand/75">
              {registrationOpen
                ? `${committeeCount} committees and ${formatNumber(seatCount)} seats, allotted on merit once your payment is confirmed. Delegates and delegations start at the same place.`
                : `${committeeCount} committees and ${formatNumber(seatCount)} seats. Registration opens here.`}
            </p>
          </div>
          <div className="lg:justify-self-end">
            <ButtonLink
              href="/register"
              size="lg"
              iconEnd={<ArrowRight className="size-5" />}
            >
              {registrationOpen
                ? `Register for ${conference.fullName}`
                : "Registration coming soon"}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </main>
  );
}
