import { CONTROL_BASE, CONTROL_BORDER } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
};

export function Select({
  options,
  placeholder,
  invalid,
  className,
  value,
  defaultValue,
  ...props
}: SelectProps) {
  /* A disabled first option is skipped by the browser's form-reset algorithm, so
     an unmanaged select would show the first real option instead of the prompt.
     Seeding the empty value keeps the prompt visible until the user chooses. */
  const resolvedDefaultValue =
    defaultValue ?? (placeholder && value === undefined ? "" : undefined);

  return (
    <div className="relative">
      <select
        {...props}
        value={value}
        defaultValue={resolvedDefaultValue}
        aria-invalid={invalid ? "true" : props["aria-invalid"]}
        className={cn(
          CONTROL_BASE,
          invalid ? CONTROL_BORDER.invalid : CONTROL_BORDER.default,
          "min-h-11 appearance-none pl-3 pr-10",
          className,
        )}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </div>
  );
}
