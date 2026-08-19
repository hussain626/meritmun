import type { ReactNode } from "react";
import { AlertTriangle } from "@/components/icons/AlertTriangle";
import { Check } from "@/components/icons/Check";
import { Info } from "@/components/icons/Info";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, { box: string; icon: string }> = {
  info: { box: "bg-brand-soft", icon: "text-brand-fg" },
  success: { box: "bg-surface-inset", icon: "text-success-fg" },
  warning: { box: "bg-surface-inset", icon: "text-warning-fg" },
  danger: { box: "bg-surface-inset", icon: "text-danger-fg" },
};

const icons: Record<AlertTone, typeof Info> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  /** Screen-reader urgency. Use "assertive" for submit failures. */
  live?: "off" | "polite" | "assertive";
  className?: string;
  children: ReactNode;
};

/** Tinted fill + icon. No side stripe — see the bans in `ui-rules.md`. */
export function Alert({
  tone = "info",
  title,
  live = "off",
  className,
  children,
}: AlertProps) {
  const Icon = icons[tone];
  const { box, icon } = tones[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      aria-live={live === "off" ? undefined : live}
      className={cn("flex gap-3 rounded-md p-4", box, className)}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", icon)} />
      <div className="min-w-0 text-sm">
        {title ? (
          <p className={cn("mb-1 font-semibold", icon)}>{title}</p>
        ) : null}
        <div className="text-fg-muted [&_a]:font-medium [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </div>
    </div>
  );
}
