import type { Metadata } from "next";
import { Calendar } from "@/components/icons/Calendar";
import { MapPin } from "@/components/icons/MapPin";
import { PageHero } from "@/components/layout/PageHero";
import { DayTabs } from "@/components/schedule/DayTabs";
import { Alert } from "@/components/ui/Alert";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { scheduleDays } from "@/content/schedule";
import { conference } from "@/content/site";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "The three-day running order for MERITMUN III — registration, six committee sessions, crisis, press, and the closing awards. Calendar dates are announced to registrants by email.",
};

export default function SchedulePage() {
  return (
    <main id="content">
      <PageHero
        title="Schedule"
        lead="Three days, from the registration desk to the closing gavel. The running order below is final — only the calendar dates are still to come."
        meta={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted">
            <span className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-brand-fg" />
              {conference.datesLabel}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-brand-fg" />
              {conference.venue}, {conference.city}
            </span>
          </div>
        }
      />

      <Section>
        <Alert tone="info" title={conference.datesLabel} className="max-w-[70ch]">
          The three days themselves are locked and so are the times below. The
          calendar dates depend on the venue booking, which closes shortly.
          Registrants are emailed the confirmed dates before they go public
          anywhere else.
        </Alert>

        <div className="mt-14">
          <SectionHeading
            title="Three days, hour by hour"
            lead={`Times are ${conference.city} local. Committee rooms are printed on your placard and posted in the foyer each morning.`}
          />

          <div className="mt-10">
            <DayTabs days={scheduleDays} />
          </div>
        </div>
      </Section>
    </main>
  );
}
