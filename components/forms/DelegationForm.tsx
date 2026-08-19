"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowLeft } from "@/components/icons/ArrowLeft";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { FormStep } from "@/components/forms/FormStep";
import { FormSummary, type SummarySection } from "@/components/forms/FormSummary";
import { PricingNote } from "@/components/forms/PricingNote";
import { SubmissionResult } from "@/components/forms/SubmissionResult";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field, describedBy } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Stepper } from "@/components/ui/Stepper";
import { Textarea } from "@/components/ui/Textarea";
import { DELEGATION_STEP_FIELDS, validateDelegation } from "@/lib/validation";
import { formatNumber } from "@/lib/utils";
import type {
  ActionResult,
  Committee,
  DelegationApplication,
  FieldErrors,
  InstitutionType,
  Submission,
} from "@/lib/types";

type Pricing = {
  currency: string;
  delegationStandard: number;
  delegationLarge: number;
  largeThreshold: number;
  minDelegation: number;
  maxDelegation: number;
};

type DelegationFormProps = {
  committees: Pick<Committee, "slug" | "abbr" | "name">[];
  pricing: Pricing;
  action: (
    prev: ActionResult<Submission> | null,
    formData: FormData,
  ) => Promise<ActionResult<Submission>>;
};

const STEPS = [
  { id: "institution", label: "Institution" },
  { id: "head", label: "Head delegate" },
  { id: "delegation", label: "Delegation" },
  { id: "review", label: "Review" },
];

const INSTITUTION_TYPE_OPTIONS = [
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
  { value: "mun-society", label: "MUN society" },
  { value: "other", label: "Other" },
];

const EMPTY: DelegationApplication = {
  institutionName: "",
  institutionCity: "",
  institutionType: "" as InstitutionType,
  headName: "",
  headEmail: "",
  headPhone: "",
  headRole: "",
  delegationSize: Number.NaN,
  facultyAccompanying: false,
  committeeSpread: [],
  accommodationCount: 0,
  notes: null,
  consent: false,
};

export function DelegationForm({
  committees,
  pricing,
  action,
}: DelegationFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<DelegationApplication>(EMPTY);
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.ok) return <SubmissionResult submission={state.data} />;

  const clientErrors = validateDelegation(
    values,
    committees.map((c) => c.slug),
  );
  const serverErrors: FieldErrors = state && !state.ok ? state.errors : {};

  function errorFor(field: string): string | undefined {
    if (serverErrors[field]) return serverErrors[field];
    return touched.has(field) ? clientErrors[field] : undefined;
  }

  function set<K extends keyof DelegationApplication>(
    key: K,
    value: DelegationApplication[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function touch(field: string) {
    setTouched((current) => new Set([...current, field]));
  }

  function goToStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function handleNext() {
    const fields = DELEGATION_STEP_FIELDS[step] ?? [];
    setTouched((current) => new Set([...current, ...fields]));
    const firstBad = fields.find((field) => clientErrors[field]);
    if (firstBad) {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstBad}"]`)
        ?.focus();
      return;
    }
    goToStep(Math.min(step + 1, STEPS.length - 1));
  }

  function toggleCommittee(slug: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      committeeSpread: checked
        ? [...current.committeeSpread, slug]
        : current.committeeSpread.filter((entry) => entry !== slug),
    }));
  }

  // Rate is live: the head delegate sees the price move as they set the size,
  // rather than discovering the bracket after they commit.
  const size = Number.isNaN(values.delegationSize) ? 0 : values.delegationSize;
  const perHead =
    size >= pricing.largeThreshold
      ? pricing.delegationLarge
      : pricing.delegationStandard;
  const total = size > 0 ? perHead * size : 0;

  const summary: SummarySection[] = [
    {
      id: "institution",
      title: "Institution",
      step: 0,
      rows: [
        { label: "Name", value: values.institutionName },
        { label: "City", value: values.institutionCity },
        {
          label: "Type",
          value:
            INSTITUTION_TYPE_OPTIONS.find(
              (o) => o.value === values.institutionType,
            )?.label ?? "",
        },
      ],
    },
    {
      id: "head",
      title: "Head delegate",
      step: 1,
      rows: [
        { label: "Name", value: values.headName },
        { label: "Role", value: values.headRole },
        { label: "Email", value: values.headEmail },
        { label: "Phone", value: values.headPhone },
      ],
    },
    {
      id: "delegation",
      title: "Delegation",
      step: 2,
      rows: [
        { label: "Size", value: size > 0 ? `${size} delegates` : "" },
        {
          label: "Rate",
          value:
            size > 0
              ? `${pricing.currency} ${formatNumber(perHead)} per head — ${pricing.currency} ${formatNumber(total)} total`
              : "",
        },
        {
          label: "Faculty",
          value: values.facultyAccompanying ? "Accompanying" : "Not accompanying",
        },
        {
          label: "Accommodation",
          value:
            values.accommodationCount > 0
              ? `${values.accommodationCount} needing rooms`
              : "None needed",
        },
        {
          label: "Committees of interest",
          value:
            values.committeeSpread
              .map((slug) => committees.find((c) => c.slug === slug)?.abbr)
              .filter(Boolean)
              .join(", ") || "No preference",
        },
        { label: "Notes", value: values.notes ?? "" },
      ],
    },
  ];

  const isLastStep = step === STEPS.length - 1;

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-9">
      <Stepper steps={STEPS} current={step} onStepSelect={goToStep} />

      {state && !state.ok ? (
        <Alert tone="danger" title="That did not go through" live="assertive">
          {state.message ?? "Check the highlighted fields and submit again."}
        </Alert>
      ) : null}

      <FormStep
        title="Your institution"
        description="One registration covers every student you bring. You will get a single invoice."
        active={step === 0}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Institution name"
            htmlFor="institutionName"
            error={errorFor("institutionName")}
            className="sm:col-span-2"
          >
            <Input
              id="institutionName"
              name="institutionName"
              autoComplete="organization"
              value={values.institutionName}
              invalid={Boolean(errorFor("institutionName"))}
              aria-describedby={describedBy("institutionName", errorFor("institutionName"))}
              onChange={(event) => set("institutionName", event.target.value)}
              onBlur={() => touch("institutionName")}
            />
          </Field>

          <Field label="City" htmlFor="institutionCity" error={errorFor("institutionCity")}>
            <Input
              id="institutionCity"
              name="institutionCity"
              value={values.institutionCity}
              invalid={Boolean(errorFor("institutionCity"))}
              aria-describedby={describedBy("institutionCity", errorFor("institutionCity"))}
              onChange={(event) => set("institutionCity", event.target.value)}
              onBlur={() => touch("institutionCity")}
            />
          </Field>

          <Field label="Type" htmlFor="institutionType" error={errorFor("institutionType")}>
            <Select
              id="institutionType"
              name="institutionType"
              placeholder="Choose one"
              options={INSTITUTION_TYPE_OPTIONS}
              value={values.institutionType}
              invalid={Boolean(errorFor("institutionType"))}
              aria-describedby={describedBy("institutionType", errorFor("institutionType"))}
              onChange={(event) => {
                set("institutionType", event.target.value as InstitutionType);
                touch("institutionType");
              }}
            />
          </Field>
        </div>
      </FormStep>

      <FormStep
        title="Head delegate"
        description="Whoever we should contact about this delegation. Every allocation and invoice goes to this address."
        active={step === 1}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" htmlFor="headName" error={errorFor("headName")}>
            <Input
              id="headName"
              name="headName"
              autoComplete="name"
              value={values.headName}
              invalid={Boolean(errorFor("headName"))}
              aria-describedby={describedBy("headName", errorFor("headName"))}
              onChange={(event) => set("headName", event.target.value)}
              onBlur={() => touch("headName")}
            />
          </Field>

          <Field
            label="Your role"
            htmlFor="headRole"
            helper="e.g. President, MUN Society — or Faculty Advisor."
            error={errorFor("headRole")}
          >
            <Input
              id="headRole"
              name="headRole"
              value={values.headRole}
              invalid={Boolean(errorFor("headRole"))}
              aria-describedby={describedBy(
                "headRole",
                errorFor("headRole"),
                "e.g. President, MUN Society — or Faculty Advisor.",
              )}
              onChange={(event) => set("headRole", event.target.value)}
              onBlur={() => touch("headRole")}
            />
          </Field>

          <Field label="Email address" htmlFor="headEmail" error={errorFor("headEmail")}>
            <Input
              id="headEmail"
              name="headEmail"
              type="email"
              autoComplete="email"
              value={values.headEmail}
              invalid={Boolean(errorFor("headEmail"))}
              aria-describedby={describedBy("headEmail", errorFor("headEmail"))}
              onChange={(event) => set("headEmail", event.target.value)}
              onBlur={() => touch("headEmail")}
            />
          </Field>

          <Field label="Phone number" htmlFor="headPhone" error={errorFor("headPhone")}>
            <Input
              id="headPhone"
              name="headPhone"
              type="tel"
              autoComplete="tel"
              placeholder="+92 300 1234567"
              value={values.headPhone}
              invalid={Boolean(errorFor("headPhone"))}
              aria-describedby={describedBy("headPhone", errorFor("headPhone"))}
              onChange={(event) => set("headPhone", event.target.value)}
              onBlur={() => touch("headPhone")}
            />
          </Field>
        </div>
      </FormStep>

      <FormStep
        title="The delegation"
        description={`Between ${pricing.minDelegation} and ${pricing.maxDelegation} students. The per-head rate drops at ${pricing.largeThreshold}.`}
        active={step === 2}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="How many delegates?"
            htmlFor="delegationSize"
            error={errorFor("delegationSize")}
          >
            <Input
              id="delegationSize"
              name="delegationSize"
              type="number"
              inputMode="numeric"
              min={pricing.minDelegation}
              max={pricing.maxDelegation}
              value={Number.isNaN(values.delegationSize) ? "" : values.delegationSize}
              invalid={Boolean(errorFor("delegationSize"))}
              aria-describedby={describedBy("delegationSize", errorFor("delegationSize"))}
              onChange={(event) => set("delegationSize", event.target.valueAsNumber)}
              onBlur={() => touch("delegationSize")}
            />
          </Field>

          <Field
            label="How many need accommodation?"
            htmlFor="accommodationCount"
            error={errorFor("accommodationCount")}
          >
            <Input
              id="accommodationCount"
              name="accommodationCount"
              type="number"
              inputMode="numeric"
              min={0}
              max={pricing.maxDelegation}
              value={Number.isNaN(values.accommodationCount) ? "" : values.accommodationCount}
              invalid={Boolean(errorFor("accommodationCount"))}
              aria-describedby={describedBy("accommodationCount", errorFor("accommodationCount"))}
              onChange={(event) => set("accommodationCount", event.target.valueAsNumber)}
              onBlur={() => touch("accommodationCount")}
            />
          </Field>
        </div>

        <PricingNote
          currency={pricing.currency}
          perHead={perHead}
          headline={
            size >= pricing.largeThreshold
              ? `Large-delegation rate, per head`
              : `Delegation rate, per head`
          }
          detail={
            size > 0
              ? `${size} delegates — ${pricing.currency} ${formatNumber(total)} in total. ${
                  size < pricing.largeThreshold
                    ? `Add ${pricing.largeThreshold - size} more and the rate drops to ${pricing.currency} ${formatNumber(pricing.delegationLarge)} per head.`
                    : "This is the best rate we offer."
                }`
              : "Enter a delegation size to see your total. Nothing is charged now — Finance invoices after the roster is confirmed."
          }
        />

        <Checkbox
          name="facultyAccompanying"
          label="A faculty member is accompanying the delegation"
          description="Hospitality will coordinate their arrangements separately."
          checked={values.facultyAccompanying}
          onChange={(event) => set("facultyAccompanying", event.target.checked)}
        />

        <fieldset className="border-0 p-0">
          <legend className="mb-1 text-sm font-medium text-fg">
            Committees your delegation is interested in
            <span className="ml-1.5 font-normal text-fg-faint">(optional)</span>
          </legend>
          <p className="mb-3 text-xs text-fg-faint">
            Guidance only — individual allocations still follow each student&apos;s
            own preferences.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {committees.map((committee) => (
              <Checkbox
                key={committee.slug}
                name="committeeSpread"
                value={committee.slug}
                label={`${committee.abbr} — ${committee.name}`}
                checked={values.committeeSpread.includes(committee.slug)}
                onChange={(event) =>
                  toggleCommittee(committee.slug, event.target.checked)
                }
              />
            ))}
          </div>
        </fieldset>

        <Field label="Anything else we should know?" htmlFor="notes" optional>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            value={values.notes ?? ""}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
      </FormStep>

      <FormStep
        title="Check it over"
        description="One last look before this goes to Delegate Affairs and Finance."
        active={step === 3}
      >
        <FormSummary sections={summary} onEdit={goToStep} />

        <Checkbox
          name="consent"
          label="I am authorised to register this delegation."
          description="And everything above is accurate to the best of my knowledge."
          checked={values.consent}
          error={errorFor("consent")}
          onChange={(event) => {
            set("consent", event.target.checked);
            touch("consent");
          }}
        />
      </FormStep>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-7">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep(step - 1)}
            iconStart={<ArrowLeft className="size-4" />}
          >
            Back
          </Button>
        ) : null}

        {isLastStep ? (
          <Button
            type="submit"
            size="lg"
            loading={isPending}
            loadingLabel="Registering your delegation…"
          >
            Register the delegation
            <ArrowRight className="size-5" />
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        )}

        <p className="text-sm text-fg-faint">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]?.label ?? ""}`}
      </p>
    </form>
  );
}
