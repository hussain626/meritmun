import type { Metadata } from "next";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { PageHero } from "@/components/layout/PageHero";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Prose } from "@/components/ui/Prose";
import { Section } from "@/components/ui/Section";
import { conference } from "@/content/site";
import { heroStats } from "@/content/stats";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Model UN is, what MERITMUN is, and what the third iteration does differently — the committees, the venue in Karachi, and the record behind it.",
};

/**
 * Longer-form rewrites of `valueProps` in `content/site.ts`. The homepage says
 * these things in one line each; About has the room to say them properly, so
 * the copy is deliberately not the same copy.
 */
const differences = [
  {
    id: "committees",
    title: "One agenda per committee, researched before you arrive",
    body: "Each of the twelve committees debates a single question for three days, not a rotating menu of five. The background guide is written by the chair who will run the room, published before allocations go out, and long enough to actually prepare from. That is why the speeches in a MERITMUN committee tend to cite something.",
  },
  {
    id: "beginners",
    title: "A genuine entry point, not a token beginner committee",
    body: "The Youth Assembly and UNEP are chaired specifically for people who have never held a placard. Procedure is taught inside the session rather than assumed, there is no cost to asking what a moderated caucus is, and a pre-conference briefing walks through the speakers' list and how a working paper gets written. First-timers win awards at this conference every year.",
  },
  {
    id: "crisis",
    title: "Crisis that responds to the room",
    body: "Two crisis committees run with a dedicated backroom and live directives. Updates are written against what delegates actually do in session, which means a bad decision on day one is still costing you on day three. Nothing is read off a pre-written timeline.",
  },
  {
    id: "record",
    title: "Third iteration, and the logistics are boring",
    body: "Two conferences behind us buys the unglamorous things: sessions that start when the schedule says, allocations that arrive on the date promised, and a secretariat that replies to email. It is the least exciting thing on this page and the one delegates mention most.",
  },
] as const;

export default function AboutPage() {
  const institutions = heroStats.find((stat) => stat.id === "institutions");
  const alumni = heroStats.find((stat) => stat.id === "alumni");

  const facts = [
    { label: "Iteration", value: `${conference.name} ${conference.iteration}` },
    { label: "Host city", value: `${conference.city}, ${conference.country}` },
    { label: "Venue", value: conference.venue },
    { label: "Dates", value: conference.datesLabel },
    { label: "Length", value: `${conference.durationDays} days` },
    { label: "Committees", value: String(conference.committeeCount) },
    { label: "Delegate seats", value: formatNumber(conference.seatCount) },
  ];

  return (
    <main id="content">
      <PageHero
        title={`About ${conference.fullName}`}
        lead={`${conference.longName}. ${conference.committeeCount} committees, ${conference.durationDays} days, and ${formatNumber(conference.seatCount)} seats in ${conference.city}.`}
      />

      <Section width="prose">
        <Prose>
          <h2>If you have not done this before</h2>
          <p>
            Model United Nations is a simulation of international negotiation.
            You are assigned a country and a committee — the Security Council,
            the World Health Organization, a national cabinet in crisis — and
            for three days you argue that country&rsquo;s position on one
            specific question, whether or not you personally agree with it.
          </p>
          <p>
            The work is real work. You research a state you have probably never
            visited, write and defend a position, build a bloc with people who
            started the morning opposing you, and put your name on a resolution
            that has to survive a vote. Nobody is acting. The skills that come
            out of it — reading a brief quickly, speaking under time pressure,
            writing something other people will sign — are the reason schools
            keep sending delegations.
          </p>
          <p>
            <strong>
              You do not need experience to register for MERITMUN III.
            </strong>{" "}
            Roughly a third of every delegation we host is at their first
            conference, and two committees exist specifically for them.
          </p>

          <h2>What MERITMUN is</h2>
          <p>
            MERITMUN is the Meritorious Model United Nations conference. This is{" "}
            {conference.fullName} — the third iteration, and the first at this
            scale: {conference.committeeCount} committees and{" "}
            {formatNumber(conference.seatCount)} delegate seats across{" "}
            {conference.durationDays} days.
          </p>
          <p>
            It is run by students, which is normal in this circuit and is not
            an excuse for anything. The Secretariat is named, the committees
            are published with their agendas and difficulty tiers before you
            pay anything, and the fee has a stated purpose. If a page of this
            site does not answer your question, a person on the Executive Board
            will.
          </p>
        </Prose>
      </Section>

      <Section band="subtle">
        <div className="grid gap-14 lg:grid-cols-[7fr_5fr] lg:gap-20">
          <div>
            <h2 className="text-h2 text-fg text-balance">
              What is different about the third one
            </h2>
            <p className="mt-5 max-w-[54ch] leading-relaxed text-fg-muted">
              Four things, and none of them is the venue. Two conferences of
              feedback went into this list.
            </p>

            <dl className="mt-10 divide-y divide-line border-t border-line">
              {differences.map((difference) => (
                <div key={difference.id} className="py-7">
                  <dt className="text-base font-semibold text-fg text-balance">
                    {difference.title}
                  </dt>
                  <dd className="mt-2.5 max-w-[58ch] leading-relaxed text-fg-muted">
                    {difference.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:self-start">
            <h3 className="text-h3 text-fg">The shape of it</h3>
            <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-6 py-3.5"
                >
                  <dt className="shrink-0 text-fg-faint">{fact.label}</dt>
                  <dd className="text-right font-medium text-fg">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </Section>

      <Section width="prose">
        <Prose>
          <h2>Karachi, and the room you will be in</h2>
          <p>
            {conference.fullName} is held at {conference.venue} in{" "}
            {conference.city}. Everything happens inside one complex: the
            General Assembly hall for opening and closing, committee rooms off
            the same corridor, the dining hall, and a central courtyard where
            unmoderated caucus actually gets settled. You will not be crossing
            the city between sessions.
          </p>
          <p>
            Out-of-city delegations are handled by the Director of Hospitality —
            accommodation, dietary requirements, and faculty coordination are
            arranged through one desk rather than four. Directions and room
            allocations are sent with your allocation email.
          </p>
        </Prose>

        <Alert
          tone="info"
          title={conference.datesLabel}
          className="mt-9 max-w-[70ch]"
        >
          The venue booking is not finalised, so the calendar dates are not
          published yet. The {conference.durationDays}-day format and the
          hour-by-hour running order are already fixed — you can read the full
          schedule now. Everyone who registers is emailed the dates the moment
          they are confirmed, before any public announcement.
        </Alert>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <div>
            <h2 className="text-h2 text-fg text-balance">
              Two conferences behind this one
            </h2>
            <div className="mt-8 h-px w-24 bg-accent" />
          </div>

          <Prose>
            <p>
              MERITMUN I opened in {conference.founded} with six committees and
              a single auditorium, and ran on the assumption that a first
              conference should be small enough to run properly. It was.
            </p>
            <p>
              MERITMUN II doubled it. School outreach took the conference from
              twenty-six delegations to{" "}
              {institutions ? formatNumber(institutions.value) : "forty-one"}{" "}
              participating institutions, the crisis track was added, and the
              International Press Corps filed a bulletin every morning of the
              conference. It is also where most of the feedback in the list
              above came from.
            </p>
            <p>
              Between the two,{" "}
              <strong>
                {alumni ? formatNumber(alumni.value) : "1,800"}+ delegates
              </strong>{" "}
              have sat in a MERITMUN committee. That is the entire track record —
              two conferences, no inflation of it, and a third one that has to
              earn its own.
            </p>
          </Prose>
        </div>
      </Section>

      <Section band="forest">
        <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:items-end">
          <div>
            <h2 className="font-display text-h2 text-on-brand text-balance">
              Registration for {conference.fullName} is open
            </h2>
            <p className="mt-4 max-w-[52ch] leading-relaxed text-on-brand/75">
              {conference.committeeCount} committees and{" "}
              {formatNumber(conference.seatCount)} seats, allocated in the order
              applications arrive. Delegates and delegations start at the same
              place.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <ButtonLink
              href="/register"
              size="lg"
              iconEnd={<ArrowRight className="size-5" />}
            >
              Register for {conference.fullName}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </main>
  );
}
