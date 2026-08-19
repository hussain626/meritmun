import { Check } from "@/components/icons/Check";
import { ButtonLink } from "@/components/ui/Button";
import type { Submission } from "@/lib/types";

type SubmissionResultProps = {
  submission: Submission;
};

const NEXT_STEPS: Record<Submission["kind"], string[]> = {
  delegate: [
    "A confirmation email is on its way to the address you gave us.",
    "Delegate Affairs matches preferences against experience, then emails your committee and portfolio.",
    "Your background guide follows allocation, so you get the guide for the committee you are actually in.",
  ],
  delegation: [
    "A confirmation email is on its way to the head delegate address.",
    "Finance will send a single invoice for the whole delegation at the per-head rate for your size.",
    "Once the roster is confirmed, allocations are issued for every student in one batch.",
  ],
  contact: [
    "The relevant desk has your message and answers within two working days.",
    "Replies come from an @meritmun.org address — check spam if nothing arrives.",
  ],
};

const HEADINGS: Record<Submission["kind"], string> = {
  delegate: "You are registered",
  delegation: "Your delegation is registered",
  contact: "Message sent",
};

export function SubmissionResult({ submission }: SubmissionResultProps) {
  return (
    <div className="animate-rise">
      <span className="grid size-12 place-items-center rounded-full bg-brand text-on-brand">
        <Check className="size-6" strokeWidth={2.5} />
      </span>

      <h2 className="mt-6 font-display text-h2 text-fg">
        {HEADINGS[submission.kind]}
      </h2>
      <p className="mt-3 max-w-[52ch] text-lg leading-normal text-fg-muted">
        Thank you, {submission.name}. Keep the reference code below — it is how
        you check your status and how we find you at registration.
      </p>

      <div className="mt-7 inline-flex flex-col gap-1 rounded-md border border-line-strong bg-surface px-6 py-5">
        <span className="text-xs tracking-wide text-fg-faint uppercase">
          Your reference code
        </span>
        <strong className="font-mono text-h3 tracking-tight text-accent-fg">
          {submission.reference}
        </strong>
      </div>

      <h3 className="mt-10 text-sm font-semibold text-fg">What happens next</h3>
      <ol className="mt-4 grid max-w-[60ch] gap-3">
        {NEXT_STEPS[submission.kind].map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-xs font-bold text-brand-fg">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/register/status" variant="secondary">
          Check your status
        </ButtonLink>
        <ButtonLink href="/committees" variant="outline">
          Browse committees
        </ButtonLink>
      </div>
    </div>
  );
}
