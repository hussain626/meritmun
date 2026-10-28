import type { Metadata } from "next";
import { PrintToolbar } from "@/components/admin/PrintToolbar";
import { requireAdminSession } from "@/lib/admin/auth";
import { listFinanceRows, summarise } from "@/lib/admin/finances";
import { formatAdminDate, formatAdminDateTime, formatPkr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Finance transcript",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed payments",
  pending: "Pending payments",
  rejected: "Rejected payments",
  "": "All payments",
};

/**
 * Printable finance transcript: every payment in the chosen status with the
 * quoted fee, the amount received, any discount and its reason, and the team
 * member who confirmed it. Print or save as PDF from the toolbar.
 */
export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminSession(["admin", "eb", "reviewer"]);
  const status = (await searchParams).status ?? "confirmed";
  const all = await listFinanceRows();
  const rows = status ? all.filter((r) => r.status === status) : all;
  const summary = summarise(rows);

  return (
    <>
      <PrintToolbar title={`Finance transcript · ${STATUS_LABEL[status] ?? "Payments"}`} />
      <article className="mx-auto max-w-5xl px-8 py-10 print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              MERITMUN III · Finance transcript
            </p>
            <h1 className="mt-1 text-2xl font-bold">{STATUS_LABEL[status] ?? "Payments"}</h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{rows.length} payments</p>
            <p className="text-neutral-500">Generated {formatAdminDate(new Date().toISOString())}</p>
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Received</dt>
            <dd className="text-lg font-bold">{formatPkr(summary.received)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Discounts given</dt>
            <dd className="text-lg font-bold">{formatPkr(summary.discounts)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Quoted, still pending</dt>
            <dd className="text-lg font-bold">{formatPkr(summary.pendingQuoted)}</dd>
          </div>
        </dl>

        <table className="mt-8 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-neutral-900 text-left">
              <th className="py-2 pr-2">Reference</th>
              <th className="py-2 pr-2">Payer</th>
              <th className="py-2 pr-2">Type</th>
              <th className="py-2 pr-2 text-right">Quoted</th>
              <th className="py-2 pr-2 text-right">Received</th>
              <th className="py-2 pr-2 text-right">Discount</th>
              <th className="py-2 pr-2">Note</th>
              <th className="py-2 pr-2">Confirmed by</th>
              <th className="py-2">Confirmed at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="break-inside-avoid border-b border-neutral-200 align-top">
                <td className="py-1.5 pr-2 font-mono">{r.reference}</td>
                <td className="py-1.5 pr-2">{r.payer}</td>
                <td className="py-1.5 pr-2">{r.typeLabel}</td>
                <td className="py-1.5 pr-2 text-right">{formatPkr(r.quoted)}</td>
                <td className="py-1.5 pr-2 text-right font-semibold">
                  {r.received == null ? "-" : formatPkr(r.received)}
                </td>
                <td className="py-1.5 pr-2 text-right">
                  {r.discount ? formatPkr(r.discount) : "-"}
                </td>
                <td className="py-1.5 pr-2">{r.note ?? "-"}</td>
                <td className="py-1.5 pr-2">{r.confirmedBy ?? "-"}</td>
                <td className="py-1.5">{r.confirmedAt ? formatAdminDateTime(r.confirmedAt) : "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-900 font-bold">
              <td className="py-2" colSpan={3}>Total</td>
              <td className="py-2 pr-2 text-right">{formatPkr(rows.reduce((s, r) => s + r.quoted, 0))}</td>
              <td className="py-2 pr-2 text-right">{formatPkr(summary.received)}</td>
              <td className="py-2 pr-2 text-right">{formatPkr(summary.discounts)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </article>
    </>
  );
}
