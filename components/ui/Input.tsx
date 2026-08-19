import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

/**
 * The shared control skin. Sizing (height, padding) is deliberately NOT in here:
 * Textarea and Select need their own, and `cn()` does no conflict resolution, so
 * two competing utilities for the same property would resolve by stylesheet
 * order rather than intent.
 */
export const CONTROL_BASE =
  "w-full rounded-sm bg-surface text-base text-fg placeholder:text-fg-faint transition-colors duration-[var(--dur-fast)] ease-out focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45";

export const CONTROL_BORDER = {
  default: "border border-line",
  invalid: "border border-danger",
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid ? "true" : props["aria-invalid"]}
      className={cn(
        CONTROL_BASE,
        invalid ? CONTROL_BORDER.invalid : CONTROL_BORDER.default,
        "min-h-11 px-3",
        className,
      )}
    />
  );
}
