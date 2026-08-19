import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  id?: string;
  /** Alternating tone band. Used on a deliberate rhythm, never every-other-by-default. */
  band?: "none" | "subtle" | "forest";
  width?: "default" | "prose" | "full";
  className?: string;
  innerClassName?: string;
  children: ReactNode;
};

const bands = {
  none: "",
  subtle: "bg-canvas-subtle",
  forest: "bg-forest text-on-brand",
} as const;

const widths = {
  default: "container-page",
  prose: "container-prose",
  full: "w-full",
} as const;

export function Section({
  id,
  band = "none",
  width = "default",
  className,
  innerClassName,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn("section-y", bands[band], className)}>
      <div className={cn(widths[width], innerClassName)}>{children}</div>
    </section>
  );
}
