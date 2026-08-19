import { formatNumber } from "@/lib/utils";

type PricingNoteProps = {
  currency: string;
  perHead: number;
  headline: string;
  detail: string;
};

/**
 * Shown inside the form, not at the end of it. Cost is never a surprise at
 * submit — that is the single biggest cause of abandonment on a paid form.
 */
export function PricingNote({
  currency,
  perHead,
  headline,
  detail,
}: PricingNoteProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 rounded-md bg-brand-soft px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-fg">{headline}</p>
        <p className="mt-1 max-w-[46ch] text-xs leading-normal text-fg-muted">
          {detail}
        </p>
      </div>
      <p className="font-display text-h3 font-bold tracking-tight text-brand-fg">
        {currency} {formatNumber(perHead)}
      </p>
    </div>
  );
}
