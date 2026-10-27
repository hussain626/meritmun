import { Check } from "@/components/icons/Check";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { formatNumber } from "@/lib/utils";
import type { Submission } from "@/lib/types";

type SubmissionResultProps = {
  submission: Submission;
};

function feeLabel(submission: Submission): string {
  return submission.fee
    ? `${submission.fee.currency} ${formatNumber(submission.fee.amount)}`
    : "the fee";
}

function nextSteps(submission: Submission): string[] {
  const fee = feeLabel(submission);
  switch (submission.kind) {
    case "delegate":
      return [
        `Pay ${fee} to one of the bank accounts in your confirmation email, quoting your delegate code${submission.delegateCode ? ` (${submission.delegateCode})` : ""} as the payment reference.`,
        "Send the transfer screenshot to Delegate Affairs. You are emailed as soon as Finance has matched it.",
        "Paid delegates are allotted on merit; your committee, portfolio and background guide arrive by email.",
      ];
    case "delegation":
      return [
        `Pay ${fee} for the whole delegation to one of the bank accounts in the confirmation email, quoting your delegation reference.`,
        "Send the transfer screenshot to Delegate Affairs. One confirmation covers every student on the roster.",
        "Once the payment is confirmed, every student is allotted and emailed their committee and portfolio.",
      ];
    case "contact":
      return [
        "The relevant desk has your message and answers within two working days.",
        "Replies come from an @meritmun.systemsummit.online address — check spam if nothing arrives.",
      ];
  }
}

const HEADINGS: Record<Submission["kind"], string> = {
  delegate: "You are registered",
  delegation: "Your delegation is registered",
  contact: "Message sent",
};

export function SubmissionResult({ submission }: SubmissionResultProps) {
  const isRegistration = submission.kind !== "contact";

  return (
    <div className="animate-rise">
      <span className="grid size-12 place-items-center rounded-full bg-brand text-on-brand">
        <Check className="size-6" strokeWidth={2.5} />
      </span>

      <h2 className="mt-6 font-display text-h2 text-fg">
        {HEADINGS[submission.kind]}
      </h2>
      <p className="mt-3 max-w-[52ch] text-lg leading-normal text-fg-muted">
        {isRegistration
          ? `Thank you, ${submission.name}. Keep the codes below — they are how you pay and how we find you at registration.`
          : `Thank you, ${submission.name}. We have your message.`}
      </p>

      {isRegistration ? (
        <div className="mt-7 flex flex-wrap gap-3">
          <div className="inline-flex flex-col gap-1 rounded-md border border-line-strong bg-surface px-6 py-5">
            <span className="text-xs tracking-wide text-fg-faint uppercase">
              Your reference code
            </span>
            <strong className="font-mono text-h3 tracking-tight text-accent-fg">
              {submission.reference}
            </strong>
          </div>
          {submission.delegateCode ? (
            <div className="inline-flex flex-col gap-1 rounded-md border border-line-strong bg-surface px-6 py-5">
              <span className="text-xs tracking-wide text-fg-faint uppercase">
                Delegate code · payment reference
              </span>
              <strong className="font-mono text-h3 tracking-tight text-accent-fg">
                {submission.delegateCode}
              </strong>
            </div>
          ) : null}
          {submission.fee ? (
            <div className="inline-flex flex-col gap-1 rounded-md border border-line-strong bg-surface px-6 py-5">
              <span className="text-xs tracking-wide text-fg-faint uppercase">
                Fee due now
              </span>
              <strong className="font-mono text-h3 tracking-tight text-fg">
                {feeLabel(submission)}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {isRegistration && submission.emailSent === false ? (
        <Alert
          tone="warning"
          title="Your confirmation email did not go out"
          className="mt-7 max-w-[60ch]"
        >
          Your registration is saved, but we could not email the bank details.
          Note the codes above and email Delegate Affairs — they will send the
          payment details directly.
        </Alert>
      ) : null}

      <h3 className="mt-10 text-sm font-semibold text-fg">What happens next</h3>
      <ol className="mt-4 grid max-w-[60ch] gap-3">
        {nextSteps(submission).map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-xs font-bold text-brand-fg">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/committees" variant="outline">
          Browse committees
        </ButtonLink>
      </div>
    </div>
  );
}
