import { Check } from "@/components/icons/Check";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { formatNumber } from "@/lib/utils";
import type { PaymentDetails, Submission } from "@/lib/types";

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
        "Upload a screenshot of the transfer with the Upload payment screenshot button above (the same link is in your confirmation email). You are emailed as soon as Finance has matched it.",
        "Paid delegates are allotted on merit; your committee, portfolio and background guide arrive by email.",
      ];
    case "delegation":
      return [
        `Pay ${fee} for the whole delegation to one of the bank accounts in the confirmation email, quoting your delegation reference.`,
        "Upload a screenshot of the transfer with the Upload payment screenshot button above (the same link is in the confirmation email). One confirmation covers every student on the roster.",
        "Once the payment is confirmed, every student is allotted and emailed their committee and portfolio.",
      ];
    case "contact":
      return [
        "The relevant desk has your message and answers within two working days.",
        "Replies come from an @meritmun.systemsummit.online address, check spam if nothing arrives.",
      ];
  }
}

/** Bank accounts and the screenshot upload link, so nobody has to wait for the email. */
function PaymentPanel({
  payment,
  reference,
}: {
  payment: PaymentDetails;
  reference: string;
}) {
  return (
    <section className="mt-8 max-w-[60ch] rounded-md border border-line-strong bg-surface p-6">
      <h3 className="text-base font-semibold text-fg">How to pay</h3>
      {payment.accounts.length > 0 ? (
        <ul className="mt-4 grid gap-4">
          {payment.accounts.map((account) => (
            <li
              key={`${account.bankName}-${account.accountNumber}`}
              className="rounded-sm border border-line p-4 text-sm"
            >
              <p className="font-semibold text-fg">{account.bankName}</p>
              <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-fg-muted">
                <dt>Account title</dt>
                <dd className="break-words text-fg">{account.accountTitle}</dd>
                <dt>Account number</dt>
                <dd className="font-mono break-all text-fg">{account.accountNumber}</dd>
                {account.iban ? (
                  <>
                    <dt>IBAN</dt>
                    <dd className="font-mono break-all text-fg">{account.iban}</dd>
                  </>
                ) : null}
                {account.branch ? (
                  <>
                    <dt>Branch</dt>
                    <dd className="text-fg">{account.branch}</dd>
                  </>
                ) : null}
              </dl>
              {account.instructions ? (
                <p className="mt-2 text-xs text-fg-faint">{account.instructions}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-fg-muted">
          Bank details follow from Delegate Affairs.
        </p>
      )}
      <p className="mt-4 text-sm text-fg-muted">
        Use <strong className="font-mono text-fg">{reference}</strong> as the
        payment reference.
      </p>
      <div className="mt-5 border-t border-line pt-5">
        <p className="text-sm font-medium text-fg">
          Paid? Upload a screenshot of the transfer.
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          The same private link is in your confirmation email, so you can
          upload it later too.
        </p>
        <ButtonLink href={payment.uploadUrl} className="mt-3" size="sm">
          Upload payment screenshot
        </ButtonLink>
      </div>
    </section>
  );
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
          ? `Thank you, ${submission.name}. Keep the codes below, they are how you pay and how we find you at registration.`
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
          {submission.coDelegate ? (
            <div className="inline-flex flex-col gap-1 rounded-md border border-line-strong bg-surface px-6 py-5">
              <span className="text-xs tracking-wide text-fg-faint uppercase">
                Co-delegate code · {submission.coDelegate.name}
              </span>
              <strong className="font-mono text-h3 tracking-tight text-accent-fg">
                {submission.coDelegate.delegateCode}
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

      {isRegistration && submission.payment ? (
        <PaymentPanel
          payment={submission.payment}
          reference={submission.delegateCode ?? submission.reference}
        />
      ) : null}

      {isRegistration && submission.emailSent === false ? (
        <Alert
          tone="warning"
          title="Your confirmation email did not go out"
          className="mt-7 max-w-[60ch]"
        >
          Your registration is saved, but we could not email the bank details.
          Note the codes above and email Delegate Affairs, they will send the
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
