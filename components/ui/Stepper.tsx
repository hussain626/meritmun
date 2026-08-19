import { Check } from "@/components/icons/Check";
import { cn } from "@/lib/utils";

export type Step = {
  id: string;
  label: string;
};

type StepperProps = {
  steps: Step[];
  /** Zero-based index of the active step. */
  current: number;
  /** Completed steps become buttons so the user can go back without losing data. */
  onStepSelect?: (index: number) => void;
  className?: string;
};

/**
 * Numerals here are semantically real (the order IS the meaning), which is the
 * one case the 01/02/03 ban in `ui-rules.md` permits.
 */
export function Stepper({
  steps,
  current,
  onStepSelect,
  className,
}: StepperProps) {
  return (
    <nav aria-label="Application progress" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {steps.map((step, index) => {
          const isComplete = index < current;
          const isCurrent = index === current;
          const canGoBack = isComplete && Boolean(onStepSelect);

          const marker = (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-[var(--dur-fast)] ease-out",
                isComplete && "bg-brand text-on-brand",
                isCurrent && "bg-accent text-on-accent",
                !isComplete && !isCurrent && "bg-surface-inset text-fg-faint",
              )}
            >
              {isComplete ? (
                <Check className="size-4" strokeWidth={2.5} />
              ) : (
                index + 1
              )}
            </span>
          );

          const label = (
            <span
              className={cn(
                "text-sm font-medium",
                isCurrent && "text-fg",
                isComplete && "text-fg-muted",
                !isComplete && !isCurrent && "text-fg-faint",
              )}
            >
              {step.label}
            </span>
          );

          return (
            <li key={step.id} className="flex items-center gap-2">
              {canGoBack ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(index)}
                  className="flex items-center gap-2 rounded-sm px-1 py-0.5 transition-opacity duration-[var(--dur-fast)] ease-out hover:opacity-75 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
                >
                  {marker}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only">
                    Go back to step {index + 1}: {step.label}
                  </span>
                </button>
              ) : (
                <span
                  className="flex items-center gap-2 px-1 py-0.5"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {marker}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">
                    Step {index + 1}: {step.label}
                  </span>
                </span>
              )}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px w-4 sm:w-8",
                    isComplete ? "bg-brand" : "bg-line",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
