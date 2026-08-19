import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  as?: ElementType;
  /** Adds hover lift + border emphasis. Only for cards that are themselves a link. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 sm:p-7",
} as const;

/**
 * A container of last resort — see the cards rule in `context/ui-rules.md`.
 * Used by exactly three features: committees, board members, and the register
 * hub. Anything else wanting a card should re-read that rule first.
 */
export function Card({
  as: Tag = "div",
  interactive = false,
  padding = "md",
  className,
  children,
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-md border border-line bg-surface",
        // Dark separates by tone, light separates by shadow. Both are correct.
        "shadow-none [[data-theme=light]_&]:shadow-sm",
        paddings[padding],
        interactive && [
          "group/card relative block transition-[border-color,box-shadow,transform]",
          "duration-[var(--dur-fast)] ease-out",
          "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md",
          "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
        ],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
