import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { Alert } from "@/components/ui/Alert";
import { Section } from "@/components/ui/Section";
import { loadPaymentTarget, type PaymentTarget } from "@/lib/payment-upload";
import { formatNumber } from "@/lib/utils";
import { UploadForm } from "./UploadForm";

export const metadata: Metadata = {
  title: "Upload payment screenshot",
  robots: { index: false, follow: false },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let target: PaymentTarget | null = null;
  let failed = false;
  try {
    target = await loadPaymentTarget(token);
  } catch (error) {
    console.warn("[meritmun] /pay load", error);
    failed = true;
  }

  if (!target) {
    return (
      <main id="content">
        <PageHero title="Upload payment screenshot" />
        <Section width="prose">
          <Alert tone={failed ? "warning" : "danger"} title={failed ? "Try again shortly" : "This link is not valid"}>
            {failed
              ? "We could not open your registration just now. Please try again in a few minutes."
              : "Open the upload link from your MERITMUN confirmation email. If it still does not work, reply to that email with your screenshot."}
          </Alert>
        </Section>
      </main>
    );
  }

  const confirmed = target.status === "confirmed";
  return (
    <main id="content">
      <PageHero
        title="Upload payment screenshot"
        lead="Paid by bank transfer? Upload a screenshot of it here. Finance matches it to your registration and emails you once it is confirmed."
      />
      <Section width="prose">
        <dl className="grid gap-px overflow-hidden rounded-md border border-line-strong bg-line sm:grid-cols-3">
          {[
            [target.kind === "delegate" ? "Delegate" : "Delegation", target.name],
            [target.kind === "delegate" ? "Delegate code" : "Reference", target.code],
            ["Amount", target.amount == null ? "See your email" : `PKR ${formatNumber(target.amount)}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface px-5 py-4">
              <dt className="text-xs tracking-wide text-fg-faint uppercase">{label}</dt>
              <dd className="mt-1 break-words font-semibold text-fg">{value}</dd>
            </div>
          ))}
        </dl>

        {confirmed ? (
          <Alert tone="success" title="Payment confirmed" className="mt-6">
            Your payment is confirmed, there is nothing more to upload.
          </Alert>
        ) : (
          <>
            {target.status === "rejected" ? (
              <Alert tone="warning" title="We could not verify your last payment" className="mt-6">
                Upload a clear screenshot of the transfer and Finance will check it again.
              </Alert>
            ) : null}
            {target.accounts.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-base font-semibold text-fg">Bank accounts</h2>
                <ul className="mt-3 grid gap-3">
                  {target.accounts.map((a) => (
                    <li key={a.id} className="rounded-sm border border-line p-4 text-sm">
                      <p className="font-semibold text-fg">{a.bankName}</p>
                      <p className="mt-1 text-fg-muted">
                        {a.accountTitle} ·{" "}
                        <span className="font-mono break-all text-fg">{a.accountNumber}</span>
                      </p>
                      {a.iban ? (
                        <p className="mt-1 font-mono text-xs break-all text-fg-muted">IBAN {a.iban}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-fg-muted">
                  Use <strong className="font-mono text-fg">{target.code}</strong> as the payment reference.
                </p>
              </section>
            ) : null}
            <UploadForm token={token} uploadedAt={target.uploadedAt} />
          </>
        )}
      </Section>
    </main>
  );
}
