"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
};

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  className,
}: SwitchProps) {
  const interactive = Boolean(onChange) && !disabled;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || !interactive}
      onClick={
        interactive && onChange
          ? () => {
              onChange(!checked);
            }
          : undefined
      }
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
        "transition-colors duration-[var(--dur-fast)] ease-out",
        checked ? "bg-success" : "bg-line-strong",
        interactive
          ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
          : "cursor-default",
        disabled && "opacity-45",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full bg-surface shadow-sm",
          "transition-transform duration-[var(--dur-fast)] ease-out",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
