"use client";

import { useActionState, useState } from "react";
import { Search } from "@/components/icons/Search";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Field, describedBy } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import type { ActionResult, ApplicationStatus, StatusResult } from "@/lib/types";

type StatusLookupFormProps = {
  action: (
    prev: ActionResult<StatusResult> | null,
    formData: FormData,
  ) => Promise<ActionResult<StatusResult>>;
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  received: "Received",
  "under-review": "Under review",
  allocated: "Allocated",
  confirmed: "Confirmed",
  "not-found": "Not found",
};

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  received: "neutral",
  "under-review": "warning",
  allocated: "brand",
  confirmed: "success",
  "not-found": "neutral",
};

/** The four real stages, in order. "not-found" is not a stage. */
const STAGES: ApplicationStatus[] = [
  "received",
  "under-review",
  "allocated",
  "confirmed",
];

export function StatusLookupForm({ action }: StatusLookupFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [reference, setReference] = useState("");

  const error = state && !state.ok ? state.errors.reference : undefined;
  const result = state?.ok ? state.data : null;
  const stageIndex = result ? STAGES.indexOf(result.status) : -1;

  return (
    <div className="grid gap-8">
      <form action={formAction} noValidate className="grid gap-5">
        <Field
          label="Reference code"
          htmlFor="reference"
          helper="On your confirmation screen and in your confirmation email."
          error={error}
        >
          <Input
            id="reference"
            name="reference"
            placeholder="MMIII-4KQ7ZP"
            autoComplete="off"
            spellCheck={false}
            value={reference}
            invalid={Boolean(error)}
            aria-describedby={describedBy(
              "reference",
              error,
              "On your confirmation screen and in your confirmation email.",
            )}
            onChange={(event) => setReference(event.target.value.toUpperCase())}
            className="font-mono tracking-wide uppercase"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" loading={isPending} loadingLabel="Looking it up…">
            <Search className="size-4" />
            Check status
          </Button>
          <p className="text-sm text-fg-faint">
            Lost your code? <a
              href="/contact"
              className="font-medium text-brand-fg underline underline-offset-4 hover:text-accent-fg"
            >
              Email Delegate Affairs
            </a>{" "}
            and we will find you.
          </p>
        </div>
      </form>

      {result ? (
        <div aria-live="polite" className="animate-rise">
          {result.status === "not-found" ? (
            <Alert tone="warning" title="No application under that code">
              {result.note}
            </Alert>
          ) : (
            <div className="rounded-lg border border-line bg-surface p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-sm text-fg-muted">
                  {result.reference}
                </p>
                <Badge tone={STATUS_TONE[result.status]}>
                  {STATUS_LABEL[result.status]}
                </Badge>
              </div>

              {result.committee ? (
                <p className="mt-5 text-h3 text-fg text-balance">
                  {result.committee}
                </p>
              ) : null}

              <p className="mt-3 max-w-[54ch] leading-relaxed text-fg-muted">
                {result.note}
              </p>

              {/* Progress rail. Stage is carried by text AND position, never by
                  colour alone. */}
              <ol className="mt-7 grid gap-3 sm:grid-cols-4">
                {STAGES.map((stage, index) => {
                  const isDone = index <= stageIndex;
                  return (
                    <li key={stage} className="grid gap-2">
                      <span
                        aria-hidden="true"
                        className={
                          isDone
                            ? "h-1 rounded-full bg-brand"
                            : "h-1 rounded-full bg-line"
                        }
                      />
                      <span
                        className={
                          isDone
                            ? "text-xs font-semibold text-fg"
                            : "text-xs text-fg-faint"
                        }
                      >
                        {STATUS_LABEL[stage]}
                        {index === stageIndex ? (
                          <span className="sr-only"> — current stage</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {result.status === "allocated" ||
              result.status === "confirmed" ? (
                <div className="mt-7">
                  <ButtonLink href="/schedule" variant="outline" size="sm">
                    See the schedule
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
