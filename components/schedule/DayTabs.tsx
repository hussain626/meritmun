"use client";

import { useState } from "react";
import { Calendar } from "@/components/icons/Calendar";
import { ScheduleTimeline } from "@/components/schedule/ScheduleTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { ButtonLink } from "@/components/ui/Button";
import type { ScheduleDay } from "@/lib/types";

/** Shared by the tablist and every panel — they must agree or the wiring breaks. */
const ID_BASE = "schedule";

type DayTabsProps = { days: ScheduleDay[]; registrationOpen: boolean };

function formatScheduleDate(value: string | null): string {
  if (!value) return "Calendar date to be announced";
  const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(parsed));
}

export function DayTabs({ days, registrationOpen }: DayTabsProps) {
  const [activeDayId, setActiveDayId] = useState<string>(days[0]?.id ?? "");

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];

  if (!activeDay) {
    return (
      <EmptyState
        title="The running order is not published yet"
        body="The three days are set but the hour-by-hour schedule has not been released. It goes up here, and registrants are emailed when it does."
        action={
          registrationOpen ? (
            <ButtonLink href="/register" variant="outline">
              Register as a delegate
            </ButtonLink>
          ) : (
            <ButtonLink href="/register" variant="outline">
              Registration coming soon
            </ButtonLink>
          )
        }
      />
    );
  }

  const tabs = days.map((day) => ({
    id: day.id,
    label: day.label,
    hint: day.theme,
  }));

  return (
    <div>
      <Tabs
        tabs={tabs}
        value={activeDay.id}
        onChange={setActiveDayId}
        label="Conference day"
        idBase={ID_BASE}
      />

      <TabPanel idBase={ID_BASE} tabId={activeDay.id} className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-line pb-5">
          {/* The one sanctioned eyebrow on this page — it marks which day of the
              sequence you are reading, which the rail alone cannot say. */}
          <p className="text-xs font-semibold tracking-caps text-brand-fg uppercase">
            {activeDay.label}
          </p>
          <p className="flex items-center gap-2 text-sm text-fg-faint">
            <Calendar className="size-4 shrink-0" />
            {formatScheduleDate(activeDay.date)}
          </p>
        </div>

        <div className="mt-9">
          <ScheduleTimeline items={activeDay.items} />
        </div>
      </TabPanel>
    </div>
  );
}
