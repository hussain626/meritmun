import type { Metadata } from "next";
import { Instagram } from "@/components/icons/Instagram";
import { Linkedin } from "@/components/icons/Linkedin";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/layout/PageHero";
import { Disclosure } from "@/components/ui/Disclosure";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { contactChannels, socials } from "@/content/site";
import { faqs } from "@/content/faq";
import { submitContact } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the MERITMUN III secretariat about registration, delegations, sponsorship, or press. We answer within two working days.",
};

const socialIcons = { instagram: Instagram, linkedin: Linkedin } as const;

export default function ContactPage() {
  return (
    <main id="content">
      <PageHero
        title="Contact the secretariat"
        lead="Real people, named on the Executive Board page, who answer their own email. Two working days, usually less."
      />

      <Section>
        <div className="grid gap-14 lg:grid-cols-[7fr_5fr] lg:gap-20">
          <div>
            <h2 className="text-h2 text-fg">Send us a message</h2>
            <p className="mt-4 max-w-[52ch] leading-relaxed text-fg-muted">
              If your question is on the list below, you will get a faster answer
              by reading it than by waiting for us.
            </p>
            <div className="mt-9">
              <ContactForm action={submitContact} />
            </div>
          </div>

          <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:self-start">
            <h2 className="text-h3 text-fg">Or go direct</h2>
            <dl className="mt-6 grid gap-6">
              {contactChannels.map((channel) => (
                <div key={channel.id}>
                  <dt className="text-xs font-semibold tracking-wide text-fg-faint uppercase">
                    {channel.label}
                  </dt>
                  <dd className="mt-1.5">
                    {channel.href ? (
                      <a
                        href={channel.href}
                        className="font-medium text-brand-fg underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-accent-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                      >
                        {channel.value}
                      </a>
                    ) : (
                      <span className="font-medium text-fg">{channel.value}</span>
                    )}
                    <p className="mt-1 text-sm leading-normal text-fg-muted">
                      {channel.note}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-10 text-h3 text-fg">Follow along</h2>
            <ul className="mt-5 flex gap-2">
              {socials.map((social) => {
                const Icon = socialIcons[social.icon as keyof typeof socialIcons];
                return (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`MERITMUN III on ${social.label}`}
                      className="grid size-11 place-items-center rounded-full border border-line text-fg-muted transition-colors duration-[var(--dur-fast)] ease-out hover:border-line-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                    >
                      {Icon ? <Icon className="size-5" /> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Section>

      <Section band="subtle">
        <SectionHeading
          title="Before you write"
          lead="The eight questions we are asked most, answered properly."
        />
        <div className="mt-10 max-w-[var(--container-prose)]">
          {faqs.map((faq) => (
            <Disclosure key={faq.id} question={faq.question}>
              {faq.answer}
            </Disclosure>
          ))}
        </div>
      </Section>
    </main>
  );
}
