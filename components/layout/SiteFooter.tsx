import Link from "next/link";
import { Instagram } from "@/components/icons/Instagram";
import { Linkedin } from "@/components/icons/Linkedin";
import { MapPin } from "@/components/icons/MapPin";
import { Wordmark } from "@/components/layout/Wordmark";
import type { NavItem } from "@/lib/types";

type SiteFooterProps = {
  items: NavItem[];
  registrationOpen: boolean;
  conference: {
    fullName: string;
    city: string;
    country: string;
    datesLabel: string;
    venue: string;
  };
  socials: readonly { label: string; href: string; icon: string }[];
};

const socialIcons = { instagram: Instagram, linkedin: Linkedin } as const;

export function SiteFooter({ items, conference, socials, registrationOpen }: SiteFooterProps) {
  const registerItem = items.find((item) => item.href === "/register");
  const pageItems = items.filter((item) => item.href !== "/register");
  const year = 2026; // Static build — no Date() so output stays deterministic.

  return (
    <footer className="mt-auto bg-forest text-on-brand">
      <div className="container-page py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-8">
          <div>
            {/* The wordmark's tokens resolve against the page, not the forest
                band, so the text colours are pinned here instead. */}
            <div className="[&_span]:!text-on-brand [&_.text-accent-fg]:!text-on-art-accent">
              <Wordmark />
            </div>
            <p className="mt-4 max-w-[34ch] text-sm leading-normal text-on-brand/75">
              The third iteration of Meritorious Model United Nations. Twelve
              committees, three days, six hundred seats.
            </p>
            <p className="mt-5 flex items-start gap-2 text-sm text-on-brand/75">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                {conference.venue}
                <br />
                {conference.city}, {conference.country}
              </span>
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-caps text-on-brand/60 uppercase">
              Conference
            </h2>
            <ul className="mt-4 space-y-2.5">
              {pageItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-on-brand/80 underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-on-brand hover:underline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-caps text-on-brand/60 uppercase">
              Register
            </h2>
            {registrationOpen ? (
              <ul className="mt-4 space-y-2.5">
                {registerItem?.children?.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className="text-sm text-on-brand/80 underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-on-brand hover:underline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-on-brand/75">
                Coming soon.{" "}
                <Link
                  href="/register"
                  className="font-semibold text-on-brand underline underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-on-art-accent focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                >
                  Learn more
                </Link>
              </p>
            )}
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-caps text-on-brand/60 uppercase">
              Stay in the loop
            </h2>
            <p className="mt-4 text-sm leading-normal text-on-brand/75">
              {conference.datesLabel}.
              {registrationOpen
                ? " Register and we will email you the moment they are confirmed."
                : " Registration opens soon — follow us for the announcement."}
            </p>
            <ul className="mt-5 flex gap-2">
              {socials.map((social) => {
                const Icon =
                  socialIcons[social.icon as keyof typeof socialIcons];
                return (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${conference.fullName} on ${social.label}`}
                      className="grid size-11 place-items-center rounded-full border border-on-brand/20 text-on-brand/80 transition-colors duration-[var(--dur-fast)] ease-out hover:border-on-brand/45 hover:text-on-brand focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                    >
                      {Icon ? <Icon className="size-5" /> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-on-brand/15 pt-6 text-xs text-on-brand/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {conference.fullName}. A student-run conference.
          </p>
          <p>{conference.datesLabel}</p>
        </div>
      </div>
    </footer>
  );
}
