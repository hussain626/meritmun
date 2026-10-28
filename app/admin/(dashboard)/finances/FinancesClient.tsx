"use client";

import { useMemo, useState, useTransition } from "react";
import { Download } from "@/components/icons/Download";
import { FileText } from "@/components/icons/FileText";
import { KpiCard } from "@/components/admin/KpiCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { listPaymentProofSheets } from "@/lib/admin/actions";
import type { FinanceRow, FinanceSummary } from "@/lib/admin/finances";
import { buildProofPdf } from "@/lib/admin/proof-pdf";
import { formatAdminDateTime, formatNumber, formatPkr } from "@/lib/utils";

type FinancesClientProps = {
  rows: FinanceRow[];
  summary: FinanceSummary;
};

function csvCell(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function FinancesClient({ rows, summary }: FinancesClientProps) {
  const [status, setStatus] = useState("confirmed");
  const [query, setQuery] = useState("");
  const [pdfPending, startPdf] = useTransition();
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (!q) return true;
      return [r.reference, r.payer, r.email, r.institution, r.confirmedBy ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, status, query]);

  function downloadCsv() {
    const header = [
      "Reference",
      "Payer",
      "Email",
      "Institution",
      "Type",
      "Status",
      "Quoted (PKR)",
      "Received (PKR)",
      "Discount (PKR)",
      "Note",
      "Confirmed by",
      "Confirmed at",
      "Screenshot",
    ];
    const lines = filtered.map((r) =>
      [
        r.reference,
        r.payer,
        r.email,
        r.institution,
        r.typeLabel,
        r.status,
        r.quoted,
        r.received,
        r.discount,
        r.note,
        r.confirmedBy,
        r.confirmedAt ? formatAdminDateTime(r.confirmedAt) : "",
        r.hasProof ? "Attached" : "",
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `meritmun-finances-${status || "all"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadScreenshots() {
    setPdfMessage(null);
    startPdf(async () => {
      const result = await listPaymentProofSheets(status);
      if (!result.ok || !result.sheets) {
        setPdfMessage(result.message);
        return;
      }
      if (result.sheets.length === 0) {
        setPdfMessage("No screenshots are attached for this filter.");
        return;
      }
      try {
        const blob = await buildProofPdf(result.sheets);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `meritmun-payment-screenshots-${status || "all"}.pdf`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setPdfMessage(`Downloaded ${result.sheets.length} screenshot${result.sheets.length === 1 ? "" : "s"} in one PDF.`);
      } catch {
        setPdfMessage("Could not build the PDF. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Finances"
        description="Every payment, who confirmed it, and for how much. Open a transcript for the full record and screenshot."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              iconStart={<Download className="size-4" />}
              onClick={downloadCsv}
            >
              Download CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconStart={<Download className="size-4" />}
              onClick={downloadScreenshots}
              loading={pdfPending}
              loadingLabel="Building PDF…"
            >
              Screenshots PDF
            </Button>
            <ButtonLink
              href={`/admin/finances-report?status=${status}`}
              target="_blank"
              size="sm"
              variant="secondary"
            >
              <FileText className="size-4" />
              Finance transcript
            </ButtonLink>
          </>
        }
      />

      {pdfMessage ? (
        <p role="status" className="text-sm text-fg-muted">
          {pdfMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Received" value={formatPkr(summary.received)} hint={`${summary.confirmed} confirmed payments`} />
        <KpiCard label="Discounts given" value={formatPkr(summary.discounts)} hint="Quoted minus received" />
        <KpiCard label="Awaiting payment" value={formatNumber(summary.pending)} hint={`${formatPkr(summary.pendingQuoted)} quoted`} />
        <KpiCard
          label="Average payment"
          value={formatPkr(summary.confirmed ? Math.round(summary.received / summary.confirmed) : 0)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5">
        <Input
          aria-label="Search payments"
          placeholder="Search reference, name, email, confirmed by…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-9 min-w-[12rem] flex-1 text-sm"
        />
        <Select
          aria-label="Payment status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "confirmed", label: "Confirmed" },
            { value: "pending", label: "Pending" },
            { value: "rejected", label: "Rejected" },
            { value: "", label: "All" },
          ]}
          className="min-h-9 w-40 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No payments here" body="Nothing matches this filter yet." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line text-xs text-fg-muted">
                <th className="px-3 py-2.5 font-semibold">Registration</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 text-right font-semibold">Quoted</th>
                <th className="px-3 py-2.5 text-right font-semibold">Received</th>
                <th className="px-3 py-2.5 font-semibold">Discount / note</th>
                <th className="px-3 py-2.5 font-semibold">Confirmed by</th>
                <th className="px-3 py-2.5 font-semibold">Transcript</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-b border-line last:border-0 align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-fg">{r.payer}</p>
                    <p className="text-xs text-fg-faint">
                      <span className="font-mono">{r.reference}</span> · {r.typeLabel}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge kind="payment" status={r.status} />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPkr(r.quoted)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {r.received == null ? "-" : formatPkr(r.received)}
                  </td>
                  <td className="max-w-[16rem] px-3 py-3 text-fg-muted">
                    {r.discount ? (
                      <p className="font-medium text-fg">
                        {r.discount > 0 ? "Discount" : "Paid above quote"} {formatPkr(Math.abs(r.discount))}
                      </p>
                    ) : null}
                    {r.note ? <p className="text-xs">{r.note}</p> : r.discount ? null : "-"}
                  </td>
                  <td className="px-3 py-3">
                    {r.confirmedBy ? (
                      <>
                        <p className="text-fg">{r.confirmedBy}</p>
                        {r.confirmedAt ? (
                          <p className="text-xs text-fg-faint">{formatAdminDateTime(r.confirmedAt)}</p>
                        ) : null}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <a
                      href={`/admin/transcript/${r.kind}/${r.id}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 font-medium text-brand-fg underline-offset-4 hover:underline"
                    >
                      <FileText className="size-4" />
                      Open{r.hasProof ? " · screenshot" : ""}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
