import {
  ScheduleItem,
  scheduleKindDot,
} from "@/components/schedule/ScheduleItem";
import { cn, formatTimeRange } from "@/lib/utils";
import type { ScheduleItem as ScheduleEntry } from "@/lib/types";

type ScheduleTimelineProps = { items: ScheduleEntry[] };

/**
 * A real rail, not a stack of cards. Each row owns its own segment of the
 * hairline, so the segments butt together into one continuous line without any
 * absolute offset that has to be kept in sync with the gutter width.
 *
 * At base width the gutter collapses: the time sits above the entry and the
 * rail stays at the far left, which keeps the whole thing inside 375px.
 */
export function ScheduleTimeline({ items }: ScheduleTimelineProps) {
  return (
    <ol>
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;

        return (
          <li
            key={item.id}
            className={cn(
              "grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3",
              "sm:grid-cols-[7.5rem_1.25rem_minmax(0,1fr)] sm:gap-x-4",
            )}
          >
            <div className="relative col-start-1 row-span-2 flex justify-center sm:col-start-2 sm:row-span-1">
              {items.length > 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute w-px bg-line",
                    isFirst ? "top-3" : "top-0",
                    isLast ? "h-3" : "bottom-0",
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative mt-2 size-2.5 rounded-full ring-4 ring-canvas",
                  scheduleKindDot[item.kind],
                )}
              />
            </div>

            <p className="col-start-2 row-start-1 font-mono text-sm whitespace-nowrap text-fg-faint tabular-nums sm:col-start-1 sm:row-start-1 sm:text-right">
              {formatTimeRange(item.start, item.end)}
            </p>

            <div className="col-start-2 row-start-2 pt-1.5 pb-9 sm:col-start-3 sm:row-start-1 sm:pt-0">
              <ScheduleItem item={item} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
