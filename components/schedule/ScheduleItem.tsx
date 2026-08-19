import { MapPin } from "@/components/icons/MapPin";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import type { ScheduleItem as ScheduleEntry, ScheduleKind } from "@/lib/types";

/**
 * Colour never carries the meaning on its own: the rail dot is tinted, and the
 * same distinction is spelled out in a text badge beside the title.
 */
export const scheduleKindLabel: Record<ScheduleKind, string> = {
  ceremony: "Ceremony",
  session: "Session",
  break: "Break",
  social: "Social",
  logistics: "Logistics",
};

export const scheduleKindTone: Record<ScheduleKind, BadgeTone> = {
  ceremony: "accent",
  session: "brand",
  break: "neutral",
  social: "success",
  logistics: "warning",
};

export const scheduleKindDot: Record<ScheduleKind, string> = {
  ceremony: "bg-accent",
  session: "bg-brand",
  break: "bg-line-strong",
  social: "bg-success",
  logistics: "bg-warning",
};

type ScheduleItemProps = { item: ScheduleEntry };

export function ScheduleItem({ item }: ScheduleItemProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-base leading-snug font-semibold text-fg text-balance">
          {item.title}
        </h3>
        <Badge tone={scheduleKindTone[item.kind]} size="sm">
          {scheduleKindLabel[item.kind]}
        </Badge>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-faint">
        <MapPin className="size-3.5 shrink-0" />
        {item.venue}
      </p>

      {item.description ? (
        <p className="mt-2.5 max-w-[58ch] text-sm leading-normal text-fg-muted">
          {item.description}
        </p>
      ) : null}
    </div>
  );
}
