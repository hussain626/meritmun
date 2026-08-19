import { FieldError } from "@/components/ui/Field";
import { cn, slugify } from "@/lib/utils";

export type RadioOption = {
  value: string;
  label: string;
  description?: string;
};

type RadioGroupProps = {
  name: string;
  options: RadioOption[];
  /** Uncontrolled initial selection. Ignored when `value` is supplied. */
  defaultValue?: string;
  /** Supply with `onChange` to drive the group as a controlled input. */
  value?: string;
  onChange?: (value: string) => void;
  legend: string;
  error?: string;
  columns?: 1 | 2;
  className?: string;
};

const COLUMN_CLASSES: Record<1 | 2, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
};

export function RadioGroup({
  name,
  options,
  defaultValue,
  value,
  onChange,
  legend,
  error,
  columns = 1,
  className,
}: RadioGroupProps) {
  const errorId = error ? `${name}-error` : undefined;
  const isControlled = value !== undefined;

  return (
    <fieldset
      className={cn("flex flex-col", className)}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={errorId}
    >
      <legend className="mb-3 text-sm font-medium text-fg">{legend}</legend>

      <div className={cn("grid gap-2", COLUMN_CLASSES[columns])}>
        {options.map((option) => {
          const optionId = `${name}-${slugify(option.value)}`;

          return (
            <div key={option.value} className="relative">
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                {...(isControlled
                  ? {
                      checked: value === option.value,
                      onChange: () => onChange?.(option.value),
                    }
                  : { defaultChecked: defaultValue === option.value })}
                className="peer sr-only"
              />

              <label
                htmlFor={optionId}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-md bg-surface py-3 pl-10 pr-3 transition-colors duration-[var(--dur-fast)] ease-out",
                  error ? "border border-danger" : "border border-line",
                  "peer-checked:border-brand peer-checked:bg-brand-soft",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-focus-visible:outline-offset-2",
                )}
              >
                <span className="text-sm font-medium text-fg">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="text-xs text-fg-faint">
                    {option.description}
                  </span>
                ) : null}
              </label>

              {/* Ring and dot sit outside the label because the peer variant only
                  reaches following siblings of the input, never descendants. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 mt-0.5 size-4.5 rounded-full border border-line-strong bg-surface transition-colors duration-[var(--dur-fast)] ease-out peer-checked:border-brand"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 mt-0.5 grid size-4.5 place-items-center opacity-0 transition-opacity duration-[var(--dur-fast)] ease-out peer-checked:opacity-100"
              >
                <span className="size-2 rounded-full bg-brand" />
              </span>
            </div>
          );
        })}
      </div>

      {error ? (
        <FieldError id={errorId} className="mt-2">
          {error}
        </FieldError>
      ) : null}
    </fieldset>
  );
}
