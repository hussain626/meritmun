import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "brand"
  | "success"
  | "warning"
  | "neutral"
  | "accent"
  | "danger";

const tones: Record<BadgeTone, string> = {
  brand: "bg-brand-soft text-brand-fg",
  success: "bg-surface-inset text-success-fg",
  warning: "bg-surface-inset text-warning-fg",
  neutral: "bg-surface-inset text-fg-muted",
  accent: "bg-surface-inset text-accent-fg",
  danger: "bg-surface-inset text-danger-fg",
};

type BadgeProps = {
  tone?: BadgeTone;
  size?: "sm" | "md";
  iconStart?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Tinted pill. No border, no side stripe — see the bans in `ui-rules.md`. */
export function Badge({
  tone = "neutral",
  size = "md",
  iconStart,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs font-semibold",
        size === "sm" ? "px-1.5 py-0.5 text-[0.6875rem]" : "px-2 py-1 text-xs",
        tones[tone],
        className,
      )}
    >
      {iconStart}
      {children}
    </span>
  );
}
