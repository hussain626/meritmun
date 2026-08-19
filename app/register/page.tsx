import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { Gavel } from "@/components/icons/Gavel";
import { Users } from "@/components/icons/Users";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/ui/Section";
import { conference, pricing } from "@/content/site";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Register for MERITMUN III as an individual delegate, or bring a delegation of five or more students from your institution.",
};

export default function RegisterPage() {
  const paths = [
    {
      href: "/register/delegate",
      icon: Gavel,
      title: "Register as a delegate",
      who: "You are applying on your own.",
      body: "Rank three committees, tell us how much experience you have, and Delegate Affairs allocates you a portfolio pitched at the right level.",
      points: [
        "Four minutes, four steps",
        "Three ranked committee preferences",
        "Most delegates get their first or second choice",
      ],
      fee: `${pricing.currency} ${formatNumber(pricing.delegate)} per delegate`,
    },
    {
      href: "/register/delegation",
      icon: Users,
      title: "Register a delegation",
      who: "You are a society head or faculty member.",
      body: `Bringing between ${pricing.minDelegation} and ${pricing.maxDelegation} students from one institution. One form, one invoice, and a reduced rate per head.`,
      points: [
        "Six minutes, four steps",
        "A single invoice for the whole delegation",
        `Rate drops again at ${pricing.largeThreshold} delegates`,
      ],
      fee: `From ${pricing.currency} ${formatNumber(pricing.delegationLarge)} per head`,
    },
  ];

  return (
    <main id="content">
      <PageHero
        title="Register for MERITMUN III"
        lead={`${conference.committeeCount} committees, three days in ${conference.city}, six hundred seats. Two ways in — pick the one that describes you.`}
        meta={
          <p className="text-sm text-fg-faint">
            {conference.datesLabel}. Registering now secures your seat and we
            email you the dates the moment they are confirmed.
          </p>
        }
      />

      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          {paths.map((path) => {
            const Icon = path.icon;
            return (
              <Link
                key={path.href}
                href={path.href}
                className="group flex flex-col rounded-lg border border-line bg-surface p-6 transition-[border-color,box-shadow,transform] duration-[var(--dur-base)] ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 sm:p-8"
              >
                <Icon className="size-8 text-brand-fg" />
                <h2 className="mt-6 font-display text-h3 font-bold text-fg text-balance">
                  {path.title}
                </h2>
                <p className="mt-2 text-sm font-semibold text-brand-fg">
                  {path.who}
                </p>
                <p className="mt-4 leading-relaxed text-fg-muted">{path.body}</p>

                <ul className="mt-6 grid flex-1 gap-2.5">
                  {path.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2.5 text-sm text-fg-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                      />
                      {point}
                    </li>
                  ))}
                </ul>

                <p className="mt-7 border-t border-line pt-5 text-sm font-semibold text-fg">
                  {path.fee}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-fg">
                  Start now
                  <ArrowRight className="size-4 transition-transform duration-[var(--dur-fast)] ease-out group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-10 text-sm text-fg-muted">
          Already applied?{" "}
          <Link
            href="/register/status"
            className="font-semibold text-brand-fg underline underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
          >
            Check your status with your reference code
          </Link>
          .
        </p>
      </Section>
    </main>
  );
}
