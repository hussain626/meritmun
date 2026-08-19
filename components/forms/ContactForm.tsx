"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { SubmissionResult } from "@/components/forms/SubmissionResult";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, describedBy } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { validateContact } from "@/lib/validation";
import type {
  ActionResult,
  ContactMessage,
  ContactTopic,
  FieldErrors,
  Submission,
} from "@/lib/types";

type ContactFormProps = {
  action: (
    prev: ActionResult<Submission> | null,
    formData: FormData,
  ) => Promise<ActionResult<Submission>>;
};

const TOPIC_OPTIONS = [
  { value: "registration", label: "Registering as a delegate" },
  { value: "delegation", label: "Bringing a delegation" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
];

const EMPTY: ContactMessage = {
  name: "",
  email: "",
  topic: "" as ContactTopic,
  subject: "",
  message: "",
};

export function ContactForm({ action }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [values, setValues] = useState<ContactMessage>(EMPTY);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.ok) return <SubmissionResult submission={state.data} />;

  const clientErrors = validateContact(values);
  const serverErrors: FieldErrors = state && !state.ok ? state.errors : {};

  function errorFor(field: string): string | undefined {
    if (serverErrors[field]) return serverErrors[field];
    return touched.has(field) ? clientErrors[field] : undefined;
  }

  function set<K extends keyof ContactMessage>(key: K, value: ContactMessage[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function touch(field: string) {
    setTouched((current) => new Set([...current, field]));
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5">
      {state && !state.ok ? (
        <Alert tone="danger" title="That did not send" live="assertive">
          {state.message ?? "Check the highlighted fields and send again."}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" error={errorFor("name")}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            value={values.name}
            invalid={Boolean(errorFor("name"))}
            aria-describedby={describedBy("name", errorFor("name"))}
            onChange={(event) => set("name", event.target.value)}
            onBlur={() => touch("name")}
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
            onBlur={() => touch("email")}
          />
        </Field>
      </div>

      <Field
        label="What is this about?"
        htmlFor="topic"
        helper="This decides which desk it lands on, so pick the closest match."
        error={errorFor("topic")}
      >
        <Select
          id="topic"
          name="topic"
          placeholder="Choose one"
          options={TOPIC_OPTIONS}
          value={values.topic}
          invalid={Boolean(errorFor("topic"))}
          aria-describedby={describedBy(
            "topic",
            errorFor("topic"),
            "This decides which desk it lands on, so pick the closest match.",
          )}
          onChange={(event) => {
            set("topic", event.target.value as ContactTopic);
            touch("topic");
          }}
        />
      </Field>

      <Field label="Subject" htmlFor="subject" error={errorFor("subject")}>
        <Input
          id="subject"
          name="subject"
          value={values.subject}
          invalid={Boolean(errorFor("subject"))}
          aria-describedby={describedBy("subject", errorFor("subject"))}
          onChange={(event) => set("subject", event.target.value)}
          onBlur={() => touch("subject")}
        />
      </Field>

      <Field
        label="Your message"
        htmlFor="message"
        helper="The more specific you are, the faster the answer."
        error={errorFor("message")}
      >
        <Textarea
          id="message"
          name="message"
          rows={6}
          value={values.message}
          invalid={Boolean(errorFor("message"))}
          aria-describedby={describedBy(
            "message",
            errorFor("message"),
            "The more specific you are, the faster the answer.",
          )}
          onChange={(event) => set("message", event.target.value)}
          onBlur={() => touch("message")}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={isPending} loadingLabel="Sending your message…">
          Send message
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-sm text-fg-faint">
          We answer within two working days.
        </p>
      </div>
    </form>
  );
}
