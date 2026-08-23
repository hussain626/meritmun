import Link from "next/link";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { Users } from "@/components/icons/Users";
import { Gavel } from "@/components/icons/Gavel";
import { Section } from "@/components/ui/Section";
import { registrationOpen } from "@/content/site";

type HomeCtaProps = {
  delegateFee: string;
  delegationFee: string;
};

const paths = [
  {
    href: "/register/delegate",
    icon: Gavel,
    title: "Register as a delegate",
    body: "You are applying on your own. Rank three committees, tell us your experience, and we will allocate you a portfolio.",
    time: "About four minutes",
  },
  {
    href: "/register/delegation",
    icon: Users,
    title: "Register a delegation",
    body: "You are a society head or faculty member bringing five or more students. One form, one invoice, a reduced rate per head.",
    time: "About six minutes",
  },
] as const;

export function HomeCta({ delegateFee, delegationFee }: HomeCtaProps) {
  const fees = [delegateFee, delegationFee];

  return (
    <Section band="forest">
      <div className="max-w-[42ch]">
        <h2 className="font-display text-h2 text-on-brand text-balance">
          {registrationOpen
            ? "Two ways in. Pick the one that describes you."
            : "Registration is coming soon."}
        </h2>
        <p className="mt-4 leading-relaxed text-on-brand/75">
          {registrationOpen
            ? "Both close when the seats run out, and the popular committees go first."
            : "Delegate and delegation registration will open here. Follow us on social media for the announcement."}
        </p>
      </div>

      {registrationOpen ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {paths.map((path, index) => {
            const Icon = path.icon;
            return (
              <Link
                key={path.href}
                href={path.href}
                className="group flex flex-col rounded-lg border border-on-brand/20 bg-on-brand/[0.06] p-6 transition-[border-color,background-color,transform] duration-[var(--dur-base)] ease-out hover:-translate-y-0.5 hover:border-on-brand/45 hover:bg-on-brand/[0.1] focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 sm:p-7"
              >
                <Icon className="size-7 text-on-art-accent" />
                <h3 className="mt-5 text-h3 font-semibold text-on-brand text-balance">
                  {path.title}
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-on-brand/75">
                  {path.body}
                </p>
                <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-brand/60">
                  <span>{fees[index]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{path.time}</span>
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-on-art-accent">
                  Start now
                  <ArrowRight className="size-4 transition-transform duration-[var(--dur-fast)] ease-out group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-10">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md border border-on-brand/30 bg-on-brand/[0.08] px-6 py-4 text-sm font-semibold text-on-brand transition-colors duration-[var(--dur-fast)] ease-out hover:border-on-brand/50 hover:bg-on-brand/[0.12] focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
          >
            Learn more
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </Section>
  );
}
