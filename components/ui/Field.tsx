import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  helper?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Builds the `aria-describedby` value for a control. Required is the default in
 * this design system, so the only two nodes a control can point at are its error
 * and its helper — and only when they actually render.
 */
export function describedBy(
  id: string,
  error?: string,
  helper?: string,
): string | undefined {
  const ids: string[] = [];
  if (error) ids.push(`${id}-error`);
  if (helper) ids.push(`${id}-helper`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function Field({
  label,
  htmlFor,
  error,
  helper,
  optional,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
        {optional ? (
          <span className="ml-1.5 font-normal text-fg-faint">(optional)</span>
        ) : null}
      </label>

      {helper ? (
        <p id={`${htmlFor}-helper`} className="text-xs text-fg-faint">
          {helper}
        </p>
      ) : null}

      {children}

      {error ? <FieldError id={`${htmlFor}-error`}>{error}</FieldError> : null}
    </div>
  );
}

type FieldErrorProps = {
  id?: string;
  children: ReactNode;
  className?: string;
};

/** Shared so Checkbox and RadioGroup render an identical error node. */
export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "flex items-start gap-1.5 text-xs text-danger-fg",
        className,
      )}
    >
      <WarningIcon />
      <span>{children}</span>
    </p>
  );
}

function WarningIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-0.5 shrink-0"
    >
      <path d="M7 1.9 12.8 11.9a.9.9 0 0 1-.78 1.35H1.98a.9.9 0 0 1-.78-1.35L7 1.9Z" />
      <path d="M7 5.9v2.6" />
      <path d="M7 10.7h.01" />
    </svg>
  );
}
