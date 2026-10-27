import type { Metadata } from "next";
import { Calendar } from "@/components/icons/Calendar";
import { MapPin } from "@/components/icons/MapPin";
import { PageHero } from "@/components/layout/PageHero";
import { DayTabs } from "@/components/schedule/DayTabs";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { conference } from "@/content/site";
import { getPublicSchedule, getRegistrationOpen } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "The three-day running order for MERITMUN III, 1, 2 and 3 January 2027 in Karachi.",
};

export default async function SchedulePage() {
  const [scheduleDays, registrationOpen] = await Promise.all([
    getPublicSchedule(),
    getRegistrationOpen(),
  ]);
  // Days without a date set in the admin take the conference dates in order.
  const datedDays = scheduleDays.map((day, index) => ({
    ...day,
    date: day.date ?? conference.dayDates[index] ?? null,
  }));
  return (
    <main id="content">
      <PageHero
        title="Schedule"
        lead="Three days, from the registration desk to the closing gavel. The running order is published here as the secretariat confirms it."
        meta={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted">
            <span className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-brand-fg" />
              {conference.datesLabel}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-brand-fg" />
              <a
                href={conference.venueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
              >
                {conference.venue}, {conference.city}
              </a>
            </span>
          </div>
        }
      />

      <Section>
        <Alert tone="info" title={conference.datesLabel} className="max-w-[70ch]">
          Three days at {conference.venue}, {conference.city}. Times below may
          still be adjusted; registrants are emailed any change.
        </Alert>

        <div className="mt-14">
          <SectionHeading
            title="Three days, hour by hour"
            lead={`Times are ${conference.city} local. Committee rooms are printed on your placard and posted in the foyer each morning.`}
          />

          <div className="mt-10">
            {scheduleDays.length > 0 ? (
              <DayTabs days={datedDays} registrationOpen={registrationOpen} />
            ) : (
              <EmptyState
                title="The running order is being finalised"
                body="The secretariat publishes the day-by-day schedule here as soon as it is set. Registrants are emailed it first."
              />
            )}
          </div>
        </div>
      </Section>
    </main>
  );
}
