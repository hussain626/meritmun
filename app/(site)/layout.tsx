import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { HelpWidget } from "@/components/layout/HelpWidget";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { conference, navItems, socials } from "@/content/site";
import { quickHelpFaqs } from "@/content/faq";
import { getPublicAnnouncement, getRegistrationOpen } from "@/lib/admin/data";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [announcement, registrationOpen] = await Promise.all([
    getPublicAnnouncement(),
    getRegistrationOpen(),
  ]);

  return (
    <div data-announce={announcement ? "on" : undefined}>
      <SkipLink />
      <div className="sticky top-0 z-[var(--z-sticky)] -mb-[var(--chrome-h)]">
        {announcement ? (
          <AnnouncementBar
            message={announcement.message}
            href={announcement.href}
            external={announcement.external}
          />
        ) : null}
        <SiteHeader items={navItems} registrationOpen={registrationOpen} />
      </div>
      {children}
      <SiteFooter
        items={navItems}
        conference={{
          fullName: conference.fullName,
          city: conference.city,
          country: conference.country,
          datesLabel: conference.datesLabel,
          venue: conference.venue,
        }}
        socials={socials}
        registrationOpen={registrationOpen}
      />
      <HelpWidget faqs={quickHelpFaqs} />
    </div>
  );
}
