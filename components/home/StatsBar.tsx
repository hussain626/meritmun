"use client";

import { useEffect, useRef } from "react";
import { formatNumber } from "@/lib/utils";
import type { Stat } from "@/lib/types";

type StatsBarProps = {
  stats: Stat[];
};

const COUNT_DURATION = 1100;

/**
 * The floating panel overlapping the hero base. The only stat block on the
 * site — see the hero-metric ban in `context/ui-rules.md`.
 *
 * The final figures are rendered server-side, so the correct number is on
 * screen with no JS and under reduced motion. The count-up is layered on top
 * imperatively, which also keeps it out of React's render path entirely.
 */
export function StatsBar({ stats }: StatsBarProps) {
  const rootRef = useRef<HTMLDListElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = rootRef.current?.querySelectorAll<HTMLElement>("[data-value]");
    if (!nodes || nodes.length === 0) return;

    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      const t = Math.min((now - start) / COUNT_DURATION, 1);
      // Exponential ease-out — the same curve as --ease-out.
      const eased = 1 - Math.pow(2, -10 * t);

      nodes?.forEach((node) => {
        const target = Number(node.dataset.value);
        const prefix = node.dataset.prefix ?? "";
        const suffix = node.dataset.suffix ?? "";
        node.textContent = `${prefix}${formatNumber(Math.round(target * (t === 1 ? 1 : eased)))}${suffix}`;
      });

      if (t < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <dl
      ref={rootRef}
      // Raised (not plain surface) because this panel floats over the hero's
      // dark art field in BOTH themes and has to read as detached from it.
      className="grid grid-cols-2 gap-x-4 gap-y-7 rounded-lg border border-line-strong bg-surface-raised px-6 py-7 shadow-xl sm:px-8 lg:grid-cols-4 lg:gap-x-8"
    >
      {stats.map((stat, index) => (
        <div
          key={stat.id}
          className={
            index > 0
              ? "lg:border-l lg:border-line lg:pl-8"
              : undefined
          }
        >
          <dd
            data-value={stat.value}
            data-prefix={stat.prefix ?? ""}
            data-suffix={stat.suffix ?? ""}
            className="font-display text-[clamp(1.75rem,1.2rem+1.8vw,2.5rem)] leading-none font-bold tracking-tight text-brand-fg tabular-nums"
          >
            {stat.prefix ?? ""}
            {formatNumber(stat.value)}
            {stat.suffix ?? ""}
          </dd>
          <dt className="mt-2 text-xs leading-snug font-medium tracking-wide text-fg-muted uppercase">
            {stat.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
