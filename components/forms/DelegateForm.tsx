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
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Select } from "@/components/ui/Select";
import { Stepper } from "@/components/ui/Stepper";
import { Textarea } from "@/components/ui/Textarea";
import {
  DELEGATE_STEP_FIELDS,
  hasErrors,
  validateDelegate,
} from "@/lib/validation";
import type {
  ActionResult,
  Committee,
  DelegateApplication,
  ExperienceLevel,
  FieldErrors,
  HearAbout,
  Submission,
} from "@/lib/types";

type DelegateFormProps = {
  committees: Pick<Committee, "slug" | "abbr" | "name" | "difficulty">[];
  preselect?: string;
  fee: { currency: string; amount: number };
  action: (
    prev: ActionResult<Submission> | null,
    formData: FormData,
  ) => Promise<ActionResult<Submission>>;
};

const STEPS = [
  { id: "personal", label: "About you" },
  { id: "experience", label: "Experience" },
  { id: "committees", label: "Committees" },
  { id: "review", label: "Review" },
];

const EXPERIENCE_OPTIONS = [
  {
    value: "first-time",
    label: "This is my first conference",
    description: "You will be prioritised for a beginner-friendly committee.",
  },
  { value: "1-3", label: "1–3 conferences" },
  { value: "4-9", label: "4–9 conferences" },
  { value: "10-plus", label: "10 or more" },
];

const HEAR_ABOUT_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "school", label: "My school or university" },
  { value: "friend", label: "A friend" },
  { value: "alumni", label: "A MERITMUN alum" },
  { value: "other", label: "Somewhere else" },
];

const EMPTY: DelegateApplication = {
  fullName: "",
  email: "",
  phone: "",
  institution: "",
  age: Number.NaN,
  city: "",
  experience: "" as ExperienceLevel,
  priorAwards: null,
  committeePrefs: ["", "", ""],
  accommodation: false,
  dietary: null,
  hearAbout: "" as HearAbout,
  consent: false,
};

/** committeePrefs is one error but three controls — send focus to the first. */
const FOCUS_TARGET: Record<string, string> = { committeePrefs: "committeePref1" };

export function DelegateForm({
  committees,
  preselect,
  fee,
  action,
}: DelegateFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState<DelegateApplication>(() => ({
    ...EMPTY,
    committeePrefs: [
      preselect && committees.some((c) => c.slug === preselect) ? preselect : "",
      "",
      "",
    ],
  }));

  if (state?.ok) return <SubmissionResult submission={state.data} />;

  const clientErrors = validateDelegate(
    values,
    committees.map((c) => c.slug),
  );
  const serverErrors: FieldErrors = state && !state.ok ? state.errors : {};

  /** A field shows an error once the user has been past it, or once the server says so. */
  function errorFor(field: string): string | undefined {
    if (serverErrors[field]) return serverErrors[field];
    return touched.has(field) ? clientErrors[field] : undefined;
  }

  function set<K extends keyof DelegateApplication>(
    key: K,
    value: DelegateApplication[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setPref(index: number, slug: string) {
    setValues((current) => {
      const next = [...current.committeePrefs];
      next[index] = slug;
      return { ...current, committeePrefs: next };
    });
  }

  function focusField(field: string) {
    const name = FOCUS_TARGET[field] ?? field;
    formRef.current
      ?.querySelector<HTMLElement>(`[name="${name}"]`)
      ?.focus();
  }

  function goToStep(next: number) {
    setStep(next);
    // Move focus to the new step's heading region rather than leaving it on a
    // button that just disappeared.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function handleNext() {
    const fields = DELEGATE_STEP_FIELDS[step] ?? [];
    setTouched((current) => new Set([...current, ...fields]));

    const firstBad = fields.find((field) => clientErrors[field]);
    if (firstBad) {
      focusField(firstBad);
      return;
    }
    goToStep(Math.min(step + 1, STEPS.length - 1));
  }

  const committeeOptions = committees.map((committee) => ({
    value: committee.slug,
    label: `${committee.abbr} — ${committee.name}`,
  }));

  /** A committee already ranked cannot be ranked again. */
  function optionsFor(index: number) {
    return committeeOptions.filter(
      (option) =>
        !values.committeePrefs.some(
          (slug, position) => position !== index && slug === option.value,
        ),
    );
  }

  const committeeName = (slug: string) =>
    committees.find((c) => c.slug === slug)?.name ?? "—";

  const summary: SummarySection[] = [
    {
      id: "personal",
      title: "About you",
      step: 0,
      rows: [
        { label: "Full name", value: values.fullName },
        { label: "Email", value: values.email },
        { label: "Phone", value: values.phone },
        { label: "Age", value: Number.isNaN(values.age) ? "" : String(values.age) },
        { label: "City", value: values.city },
        { label: "Institution", value: values.institution },
      ],
    },
    {
      id: "experience",
      title: "Experience",
      step: 1,
      rows: [
        {
          label: "Conferences attended",
          value:
            EXPERIENCE_OPTIONS.find((o) => o.value === values.experience)
              ?.label ?? "",
        },
        { label: "Awards", value: values.priorAwards ?? "" },
        {
          label: "How you heard",
          value:
            HEAR_ABOUT_OPTIONS.find((o) => o.value === values.hearAbout)
              ?.label ?? "",
        },
      ],
    },
    {
      id: "committees",
      title: "Committee preferences",
      step: 2,
      rows: [
        { label: "First choice", value: committeeName(values.committeePrefs[0]) },
        { label: "Second choice", value: committeeName(values.committeePrefs[1]) },
        { label: "Third choice", value: committeeName(values.committeePrefs[2]) },
        { label: "Accommodation", value: values.accommodation ? "Yes, please" : "Not needed" },
        { label: "Dietary needs", value: values.dietary ?? "" },
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
        title="About you"
        description="The basics we need to allocate you and to reach you if anything changes."
        active={step === 0}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" error={errorFor("fullName")}>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              value={values.fullName}
              invalid={Boolean(errorFor("fullName"))}
              aria-describedby={describedBy("fullName", errorFor("fullName"))}
              onChange={(event) => set("fullName", event.target.value)}
              onBlur={() => setTouched((c) => new Set([...c, "fullName"]))}
            />
          </Field>

          <Field
            label="Age"
            htmlFor="age"
            helper="Delegates must be 13 or older."
            error={errorFor("age")}
          >
            <Input
              id="age"
              name="age"
              type="number"
              inputMode="numeric"
              min={13}
              max={30}
              value={Number.isNaN(values.age) ? "" : values.age}
              invalid={Boolean(errorFor("age"))}
              aria-describedby={describedBy(
                "age",
                errorFor("age"),
                "Delegates must be 13 or older.",
              )}
              onChange={(event) => set("age", event.target.valueAsNumber)}
              onBlur={() => setTouched((c) => new Set([...c, "age"]))}
            />
          </Field>

          <Field label="Email address" htmlFor="email" error={errorFor("email")}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              invalid={Boolean(errorFor("email"))}
              aria-describedby={describedBy("email", errorFor("email"))}
              onChange={(event) => set("email", event.target.value)}
              onBlur={() => setTouched((c) => new Set([...c, "email"]))}
            />
          </Field>

          <Field label="Phone number" htmlFor="phone" error={errorFor("phone")}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+92 300 1234567"
              value={values.phone}
              invalid={Boolean(errorFor("phone"))}
              aria-describedby={describedBy("phone", errorFor("phone"))}
              onChange={(event) => set("phone", event.target.value)}
              onBlur={() => setTouched((c) => new Set([...c, "phone"]))}
            />
          </Field>

          <Field label="City" htmlFor="city" error={errorFor("city")}>
            <Input
              id="city"
              name="city"
              autoComplete="address-level2"
              value={values.city}
              invalid={Boolean(errorFor("city"))}
              aria-describedby={describedBy("city", errorFor("city"))}
              onChange={(event) => set("city", event.target.value)}
              onBlur={() => setTouched((c) => new Set([...c, "city"]))}
            />
          </Field>

          <Field
            label="School or university"
            htmlFor="institution"
            error={errorFor("institution")}
          >
            <Input
              id="institution"
              name="institution"
              autoComplete="organization"
              value={values.institution}
              invalid={Boolean(errorFor("institution"))}
              aria-describedby={describedBy("institution", errorFor("institution"))}
              onChange={(event) => set("institution", event.target.value)}
              onBlur={() => setTouched((c) => new Set([...c, "institution"]))}
            />
          </Field>
        </div>

        <PricingNote
          currency={fee.currency}
          perHead={fee.amount}
          headline="Individual delegate fee"
          detail="Covers all three days, lunches, the delegate dinner, and conference materials. Payable after allocation — nothing is charged now."
        />
      </FormStep>

      <FormStep
        title="Your experience"
        description="This decides nothing about whether you are accepted. It only helps us put you in a room pitched at the right level."
        active={step === 1}
      >
        <RadioGroup
          name="experience"
          legend="How many Model UN conferences have you attended?"
          options={EXPERIENCE_OPTIONS}
          value={values.experience}
          error={errorFor("experience")}
          onChange={(value) => {
            set("experience", value as ExperienceLevel);
            setTouched((c) => new Set([...c, "experience"]));
          }}
        />

        <Field
          label="Awards or positions held"
          htmlFor="priorAwards"
          optional
          helper="Best Delegate, chairing, secretariat roles — anything relevant."
          error={errorFor("priorAwards")}
        >
          <Textarea
            id="priorAwards"
            name="priorAwards"
            rows={3}
            value={values.priorAwards ?? ""}
            aria-describedby={describedBy(
              "priorAwards",
              undefined,
              "Best Delegate, chairing, secretariat roles — anything relevant.",
            )}
            onChange={(event) => set("priorAwards", event.target.value)}
          />
        </Field>

        <Field
          label="How did you hear about MERITMUN?"
          htmlFor="hearAbout"
          error={errorFor("hearAbout")}
        >
          <Select
            id="hearAbout"
            name="hearAbout"
            placeholder="Choose one"
            options={HEAR_ABOUT_OPTIONS}
            value={values.hearAbout}
            invalid={Boolean(errorFor("hearAbout"))}
            aria-describedby={describedBy("hearAbout", errorFor("hearAbout"))}
            onChange={(event) => {
              set("hearAbout", event.target.value as HearAbout);
              setTouched((c) => new Set([...c, "hearAbout"]));
            }}
          />
        </Field>
      </FormStep>

      <FormStep
        title="Committee preferences"
        description="Rank three, in order. Most delegates get their first or second choice — ranking three genuinely different committees improves your odds."
        active={step === 2}
      >
        <div className="grid gap-5">
          {[0, 1, 2].map((index) => (
            <Field
              key={index}
              label={["First choice", "Second choice", "Third choice"][index]}
              htmlFor={`committeePref${index + 1}`}
              error={index === 0 ? errorFor("committeePrefs") : undefined}
            >
              <Select
                id={`committeePref${index + 1}`}
                name={`committeePref${index + 1}`}
                placeholder="Choose a committee"
                options={optionsFor(index)}
                value={values.committeePrefs[index]}
                invalid={index === 0 && Boolean(errorFor("committeePrefs"))}
                aria-describedby={
                  index === 0
                    ? describedBy("committeePref1", errorFor("committeePrefs"))
                    : undefined
                }
                onChange={(event) => {
                  setPref(index, event.target.value);
                  setTouched((c) => new Set([...c, "committeePrefs"]));
                }}
              />
            </Field>
          ))}
        </div>

        <Checkbox
          name="accommodation"
          label="I need help with accommodation"
          description="Hospitality will email you partner options near the venue. Arranged separately from the registration fee."
          checked={values.accommodation}
          onChange={(event) => set("accommodation", event.target.checked)}
        />

        <Field
          label="Dietary requirements"
          htmlFor="dietary"
          optional
          error={errorFor("dietary")}
        >
          <Input
            id="dietary"
            name="dietary"
            value={values.dietary ?? ""}
            onChange={(event) => set("dietary", event.target.value)}
          />
        </Field>
      </FormStep>

      <FormStep
        title="Check it over"
        description="One last look before this goes to Delegate Affairs."
        active={step === 3}
      >
        <FormSummary sections={summary} onEdit={goToStep} />

        <Checkbox
          name="consent"
          label="Everything above is accurate."
          description="We allocate on the basis of what you have told us here."
          checked={values.consent}
          error={errorFor("consent")}
          onChange={(event) => {
            set("consent", event.target.checked);
            setTouched((c) => new Set([...c, "consent"]));
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
          <Button type="submit" size="lg" loading={isPending} loadingLabel="Submitting your application…">
            Submit my application
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

      {/* Announced rather than shown: the visible stepper already carries this
          for sighted users. */}
      <p aria-live="polite" className="sr-only">
        {`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]?.label ?? ""}`}
        {hasErrors(serverErrors)
          ? ` — ${Object.keys(serverErrors).length} field needs attention.`
          : ""}
      </p>
    </form>
  );
}
