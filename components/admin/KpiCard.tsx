import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KpiTone = "default" | "accent" | "success" | "warning" | "danger";

const iconTone: Record<KpiTone, string> = {
  default: "bg-surface-inset text-fg-muted",
  accent: "bg-accent/15 text-accent-fg",
  success: "bg-brand-soft text-brand-fg",
  warning: "bg-accent/20 text-warning-fg",
  danger: "bg-surface-inset text-danger-fg",
};

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Dense ops KPI tile — not the public marketing stats bar. */
export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  action,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-line bg-surface p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <span
            className={cn(
              "grid size-8 place-items-center rounded-sm",
              iconTone[tone],
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : (
          <p className="text-sm font-medium text-fg-muted">{label}</p>
        )}
        {action}
      </div>
      {icon ? (
        <p className="mt-3 text-sm font-medium text-fg-muted">{label}</p>
      ) : null}
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-fg">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}
