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
  needsCoDelegate,
  DELEGATE_STEP_FIELDS,
  hasErrors,
  validateDelegate,
} from "@/lib/validation";
import { formatNumber } from "@/lib/utils";
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
  committees: Pick<
    Committee,
    "slug" | "abbr" | "name" | "difficulty" | "doubleDelegate"
  >[];
  preselect?: string;
  /** Individual fee for each social tier (early bird already applied). */
  fee: { currency: string; withSocial: number; withoutSocial: number };
  action: (
    prev: ActionResult<Submission> | null,
    formData: FormData,
  ) => Promise<ActionResult<Submission>>;
  /** Staff registering on someone's behalf while public registration is closed. */
  manual?: boolean;
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
  city: "",
  experience: "" as ExperienceLevel,
  priorAwards: null,
  committeePrefs: ["", "", ""],
  accommodation: false,
  withSocial: true,
  hearAbout: "" as HearAbout,
  referredBy: null,
  coDelegate: null,
  consent: false,
};

/** committeePrefs is one error but three controls, send focus to the first. */
const FOCUS_TARGET: Record<string, string> = { committeePrefs: "committeePref1" };

export function DelegateForm({
  committees,
  preselect,
  fee,
  action,
  manual = false,
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

  const chosenFee = values.withSocial ? fee.withSocial : fee.withoutSocial;
  const doubles = committees
    .filter((c) => c.doubleDelegate)
    .map(({ slug, abbr }) => ({ slug, abbr }));
  const showCoDelegate = needsCoDelegate(values.committeePrefs, doubles);
  const firstChoice = committees.find((c) => c.slug === values.committeePrefs[0]);
  const partner = values.coDelegate?.mode === "partner" ? values.coDelegate : null;
  const clientErrors = validateDelegate(
    showCoDelegate ? values : { ...values, coDelegate: null },
    committees.map((c) => c.slug),
    doubles,
  );

  function setCoMode(mode: "random" | "partner") {
    setValues((current) => ({
      ...current,
      coDelegate:
        mode === "random"
          ? { mode: "random" }
          : {
              mode: "partner",
              fullName: "",
              email: "",
              phone: "",
              experience: "" as ExperienceLevel,
              ...(current.coDelegate?.mode === "partner" ? current.coDelegate : {}),
            },
    }));
  }

  function setPartner(field: "fullName" | "email" | "phone" | "experience", value: string) {
    setValues((current) =>
      current.coDelegate?.mode === "partner"
        ? { ...current, coDelegate: { ...current.coDelegate, [field]: value } }
        : current,
    );
  }
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
    label: `${committee.abbr}: ${committee.name}`,
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
    committees.find((c) => c.slug === slug)?.name ?? "-";

  const summary: SummarySection[] = [
    {
      id: "personal",
      title: "About you",
      step: 0,
      rows: [
        { label: "Full name", value: values.fullName },
        { label: "Email", value: values.email },
        { label: "Phone", value: values.phone },
        { label: "City", value: values.city },
        { label: "Institution", value: values.institution },
        {
          label: "Fee option",
          value: `${values.withSocial ? "With social" : "Without social"}, ${fee.currency} ${formatNumber(chosenFee)}`,
        },
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
        { label: "Reference", value: values.referredBy ?? "" },
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
        ...(showCoDelegate
          ? [
              {
                label: "Co-delegate",
                value: partner
                  ? `${partner.fullName} (${partner.email}), you pay for both`
                  : values.coDelegate?.mode === "random"
                    ? "Pair me with a co-delegate"
                    : "",
              },
            ]
          : []),
        { label: "Accommodation", value: values.accommodation ? "Yes, please" : "Not needed" },
      ],
    },
  ];

  const isLastStep = step === STEPS.length - 1;

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-9">
      {manual ? <input type="hidden" name="manual" value="1" /> : null}
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
          <Field
            label="Full name"
            htmlFor="fullName"
            error={errorFor("fullName")}
            className="sm:col-span-2"
          >
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

        <RadioGroup
          name="socialTier"
          legend="Fee option"
          options={[
            {
              value: "with",
              label: `With social, ${fee.currency} ${formatNumber(fee.withSocial)}`,
            },
            {
              value: "without",
              label: `Without social, ${fee.currency} ${formatNumber(fee.withoutSocial)}`,
            },
          ]}
          value={values.withSocial ? "with" : "without"}
          onChange={(value) => set("withSocial", value === "with")}
        />

        <PricingNote
          currency={fee.currency}
          perHead={chosenFee}
          headline={values.withSocial ? "Individual fee, with social" : "Individual fee, without social"}
          detail="Covers all three days of the conference. Pay by bank transfer after you submit, the account details and your payment reference arrive in your confirmation email."
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
          helper="Best Delegate, chairing, secretariat roles, anything relevant."
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
              "Best Delegate, chairing, secretariat roles, anything relevant.",
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

        <Field
          label="Reference"
          htmlFor="referredBy"
          optional
          helper="Did someone refer you? Add their name, e.g. a campus ambassador or a MERITMUN team member."
          error={errorFor("referredBy")}
        >
          <Input
            id="referredBy"
            name="referredBy"
            maxLength={120}
            value={values.referredBy ?? ""}
            invalid={Boolean(errorFor("referredBy"))}
            aria-describedby={describedBy(
              "referredBy",
              errorFor("referredBy"),
              "Did someone refer you? Add their name, e.g. a campus ambassador or a MERITMUN team member.",
            )}
            onChange={(event) => set("referredBy", event.target.value)}
          />
        </Field>
      </FormStep>

      <FormStep
        title="Committee preferences"
        description="Rank three, in order. Your first choice weighs most; ranking three genuinely different committees improves your odds."
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

        {showCoDelegate && firstChoice ? (
          <div className="grid gap-5 rounded-md border border-line bg-surface p-5">
            <RadioGroup
              name="coDelegateMode"
              legend={`${firstChoice.abbr} seats two delegates per country. Who is your co-delegate?`}
              options={[
                {
                  value: "random",
                  label: "Pair me with a co-delegate",
                  description: "We match you with another delegate. You pay for one seat.",
                },
                {
                  value: "partner",
                  label: "I am bringing my co-delegate",
                  description: `You register and pay for both of you (${fee.currency} ${formatNumber(chosenFee * 2)}). You are seated together.`,
                },
              ]}
              value={values.coDelegate?.mode ?? ""}
              error={errorFor("coDelegate")}
              onChange={(value) => {
                setCoMode(value as "random" | "partner");
                setTouched((c) => new Set([...c, "coDelegate"]));
              }}
            />
            {partner ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Co-delegate full name"
                  htmlFor="coFullName"
                  error={errorFor("coDelegate.fullName")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="coFullName"
                    name="coFullName"
                    value={partner.fullName}
                    invalid={Boolean(errorFor("coDelegate.fullName"))}
                    onChange={(event) => setPartner("fullName", event.target.value)}
                    onBlur={() => setTouched((c) => new Set([...c, "coDelegate.fullName"]))}
                  />
                </Field>
                <Field label="Co-delegate email" htmlFor="coEmail" error={errorFor("coDelegate.email")}>
                  <Input
                    id="coEmail"
                    name="coEmail"
                    type="email"
                    value={partner.email}
                    invalid={Boolean(errorFor("coDelegate.email"))}
                    onChange={(event) => setPartner("email", event.target.value)}
                    onBlur={() => setTouched((c) => new Set([...c, "coDelegate.email"]))}
                  />
                </Field>
                <Field label="Co-delegate phone" htmlFor="coPhone" error={errorFor("coDelegate.phone")}>
                  <Input
                    id="coPhone"
                    name="coPhone"
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={partner.phone}
                    invalid={Boolean(errorFor("coDelegate.phone"))}
                    onChange={(event) => setPartner("phone", event.target.value)}
                    onBlur={() => setTouched((c) => new Set([...c, "coDelegate.phone"]))}
                  />
                </Field>
                <Field
                  label="Co-delegate experience"
                  htmlFor="coExperience"
                  error={errorFor("coDelegate.experience")}
                  className="sm:col-span-2"
                >
                  <Select
                    id="coExperience"
                    name="coExperience"
                    placeholder="Choose one"
                    options={EXPERIENCE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                    value={partner.experience}
                    invalid={Boolean(errorFor("coDelegate.experience"))}
                    onChange={(event) => {
                      setPartner("experience", event.target.value);
                      setTouched((c) => new Set([...c, "coDelegate.experience"]));
                    }}
                  />
                </Field>
                <PricingNote
                  currency={fee.currency}
                  perHead={chosenFee * 2}
                  headline="Fee for you and your co-delegate"
                  detail="One payment covers both seats. Your co-delegate gets their own delegate code."
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <Checkbox
          name="accommodation"
          label="I need help with accommodation"
          description="Delegate Affairs will email you about options. Arranged separately from the registration fee."
          checked={values.accommodation}
          onChange={(event) => set("accommodation", event.target.checked)}
        />
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
          <Button key="submit" type="submit" size="lg" loading={isPending} loadingLabel="Submitting your application…">
            Submit my application
            <ArrowRight className="size-5" />
          </Button>
        ) : (
          <Button key="next" type="button" onClick={handleNext}>
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
          ? `, ${Object.keys(serverErrors).length} field needs attention.`
          : ""}
      </p>
    </form>
  );
}
