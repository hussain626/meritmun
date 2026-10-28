"use client";

import { useState, useTransition } from "react";
import { Mail } from "@/components/icons/Mail";
import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { sendPresidentEmail } from "@/lib/admin/actions";

type MailClientProps = {
  from: string;
  defaultSignature: string;
};

export function MailClient({ from, defaultSignature }: MailClientProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signature, setSignature] = useState(defaultSignature);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startSend] = useTransition();

  function send(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);
    startSend(async () => {
      const outcome = await sendPresidentEmail({ to, cc, subject, body, signature });
      setResult(outcome);
      if (outcome.ok) {
        setTo("");
        setCc("");
        setSubject("");
        setBody("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Mail"
        description="Write a quick email from the president's inbox. Replies go back to that inbox in Resend."
      />

      <form
        onSubmit={send}
        className="flex max-w-3xl flex-col gap-5 rounded-lg border border-line bg-surface p-4 sm:p-6"
      >
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg">From</span>
          <span className="break-all rounded-md border border-line bg-surface-inset px-3 py-2 text-fg-muted">
            {from}
          </span>
        </div>

        <Field
          label="To"
          htmlFor="mail-to"
          helper="Separate several addresses with commas. Everyone in To and Cc sees each other."
        >
          <Input
            id="mail-to"
            type="text"
            inputMode="email"
            autoComplete="off"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="name@example.com"
          />
        </Field>

        {showCc ? (
          <Field label="Cc" htmlFor="mail-cc" optional>
            <Input
              id="mail-cc"
              type="text"
              inputMode="email"
              autoComplete="off"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setShowCc(true)}
            className="-mt-2 self-start text-sm font-medium text-accent-fg underline-offset-4 hover:underline"
          >
            Add Cc
          </button>
        )}

        <Field label="Subject" htmlFor="mail-subject">
          <Input
            id="mail-subject"
            required
            maxLength={150}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>

        <Field
          label="Message"
          htmlFor="mail-body"
          helper="Leave a blank line between paragraphs. It is sent in the MERITMUN email layout with the logo."
        >
          <Textarea
            id="mail-body"
            required
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>

        <Field label="Signature" htmlFor="mail-signature">
          <Textarea
            id="mail-signature"
            rows={2}
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
          />
        </Field>

        {result ? (
          <Alert tone={result.ok ? "success" : "danger"} live="polite">
            {result.message}
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            iconStart={<Mail className="size-4" />}
            loading={pending}
            loadingLabel="Sending…"
          >
            Send email
          </Button>
        </div>
      </form>
    </div>
  );
}
