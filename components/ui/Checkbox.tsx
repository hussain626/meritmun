import { FieldError } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  error?: string;
  description?: string;
};

export function Checkbox({
  label,
  error,
  description,
  className,
  id,
  ...props
}: CheckboxProps) {
  const errorId = id && error ? `${id}-error` : undefined;
  const descriptionId = id && description ? `${id}-description` : undefined;
  const describedByIds = [errorId, descriptionId].filter(Boolean).join(" ");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="relative flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
        <input
          {...props}
          id={id}
          type="checkbox"
          aria-invalid={error ? "true" : props["aria-invalid"]}
          aria-describedby={describedByIds || undefined}
          className="peer sr-only"
        />

        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-5 shrink-0 rounded-xs bg-surface transition-colors duration-[var(--dur-fast)] ease-out",
            error ? "border border-danger" : "border border-line-strong",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-focus-visible:outline-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-45",
          )}
        />

        {/* The tick is a sibling of the input, not a child of the box: the peer
            variant only reaches following siblings, never their descendants. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-2.5 mt-0.5 grid size-5 place-items-center text-on-accent opacity-0 transition-opacity duration-[var(--dur-fast)] ease-out peer-checked:opacity-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m2.5 7.3 3 3 6-6.6" />
          </svg>
        </span>

        <span className="flex flex-col gap-0.5">
          <span className="text-sm text-fg">{label}</span>
          {description ? (
            <span id={descriptionId} className="text-xs text-fg-faint">
              {description}
            </span>
          ) : null}
        </span>
      </label>

      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
