import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/components/admin/PrintToolbar";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getPricing,
  listAllotments,
  listCommitteesAdmin,
  listDelegates,
  listDelegations,
  listPortfolios,
  listTeamProfiles,
} from "@/lib/admin/data";
import { isPdfProof, proofUrl } from "@/lib/admin/payment-proof";
import { owedForDelegate, owedForDelegation } from "@/lib/admin/fees";
import type { DelegateRecord } from "@/lib/admin/types";
import { formatAdminDate, formatAdminDateTime, formatPkr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Registration transcript",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ kind: string; id: string }>;
};

const EXPERIENCE: Record<string, string> = {
  "first-time": "First conference",
  "1-3": "1–3 conferences",
  "4-9": "4–9 conferences",
  "10-plus": "10 or more",
};

const STATUS: Record<string, string> = {
  pending: "Payment pending",
  confirmed: "Payment confirmed",
  rejected: "Payment not matched",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[11rem_1fr] gap-3 border-b border-neutral-200 py-1.5 text-sm last:border-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium">{value || "-"}</dd>
    </div>
  );
}

/**
 * Printable record of one registration and its payment: who registered, what
 * was quoted, what was received (and any discount with its reason), when and
 * by which screenshot it was confirmed, and the seat if one has been issued.
 */
export default async function TranscriptPage({ params }: PageProps) {
  await requireAdminSession(["admin", "eb", "reviewer"]);
  const { kind, id } = await params;
  if (kind !== "delegate" && kind !== "delegation") notFound();

  const [delegates, delegations, allotments, committees, portfolios, pricing, profiles] =
    await Promise.all([
      listDelegates(),
      listDelegations(),
      listAllotments(),
      listCommitteesAdmin(),
      listPortfolios(),
      getPricing(),
      listTeamProfiles(),
    ]);
  const staffName = (id: string | null | undefined) =>
    id
      ? (profiles.find((p) => p.id === id)?.fullName ??
        (id === "demo-admin" ? "Demo Admin" : "Former team member"))
      : null;
  const committeeName = new Map(committees.map((c) => [c.id, `${c.abbr}: ${c.name}`]));
  const committeeBySlug = new Map(committees.map((c) => [c.slug, c.abbr]));
  const country = new Map(portfolios.map((p) => [p.id, p.countryName]));
  const seatOf = (delegateId: string) => {
    const a = allotments.find((x) => x.delegateId === delegateId && x.status === "confirmed");
    return a ? `${committeeName.get(a.committeeId) ?? "-"} · ${country.get(a.portfolioId) ?? "-"}` : "Not issued yet";
  };
  const prefs = (d: DelegateRecord) =>
    d.committeePrefs.map((s) => committeeBySlug.get(s) ?? s.toUpperCase()).join(" › ");

  let title: string;
  let reference: string;
  let status: string;
  let quoted: number;
  let received: number | null;
  let note: string | null | undefined;
  let confirmedAt: string | null | undefined;
  let confirmedBy: string | null = null;
  let proofPath: string | null | undefined;
  let details: { label: string; value: string }[];
  let roster: DelegateRecord[] = [];

  if (kind === "delegate") {
    const d = delegates.find((x) => x.id === id);
    if (!d) notFound();
    if (d.delegationId) {
      // A member's payment is the delegation's: show that transcript's roster row.
      const parent = delegations.find((x) => x.id === d.delegationId);
      if (parent) {
        return (
          <p className="p-8 text-sm">
            {d.fullName} registered with {parent.institutionName} ({parent.reference}).
            Open the delegation&apos;s transcript from the Delegations tab.
          </p>
        );
      }
    }
    title = d.fullName;
    reference = d.reference;
    status = d.paymentStatus;
    quoted = owedForDelegate(d, pricing);
    received = d.paymentAmount;
    note = d.paymentNote;
    confirmedAt = d.paymentConfirmedAt;
    confirmedBy = staffName(d.paymentConfirmedBy);
    proofPath = d.paymentProofPath;
    details = [
      { label: "Delegate code", value: d.delegateCode },
      { label: "Email", value: d.email },
      { label: "Phone", value: d.phone },
      { label: "Institution", value: d.institution },
      { label: "City", value: d.city },
      { label: "Experience", value: EXPERIENCE[d.experience] ?? d.experience },
      { label: "Awards", value: d.priorAwards ?? "-" },
      { label: "Preferences", value: prefs(d) },
      { label: "Registered", value: formatAdminDateTime(d.createdAt) },
      { label: "Fee option", value: d.withSocial === false ? "Without social" : "With social" },
      { label: "Seat", value: seatOf(d.id) },
      ...delegates
        .filter((x) => x.paidBy === d.id)
        .map((x) => ({
          label: "Co-delegate (paid for)",
          value: `${x.fullName} · ${x.delegateCode} · ${seatOf(x.id)}`,
        })),
    ];
  } else {
    const g = delegations.find((x) => x.id === id);
    if (!g) notFound();
    roster = delegates.filter((x) => x.delegationId === id);
    title = g.institutionName;
    reference = g.reference;
    status = g.paymentStatus;
    quoted = owedForDelegation(g, roster, pricing);
    received = g.paymentAmount;
    note = g.paymentNote;
    confirmedAt = g.paymentConfirmedAt;
    confirmedBy = staffName(g.paymentConfirmedBy);
    proofPath = g.paymentProofPath;
    details = [
      { label: "Head delegate", value: `${g.headName} (${g.headRole})` },
      { label: "Email", value: g.headEmail },
      { label: "Phone", value: g.headPhone },
      { label: "City", value: g.institutionCity },
      { label: "Delegates", value: String(roster.length || g.delegationSize) },
      { label: "Registered", value: formatAdminDateTime(g.createdAt) },
    ];
  }

  const proof = proofPath ? await proofUrl(proofPath) : null;
  const discount = received != null ? quoted - received : 0;

  return (
    <>
      <PrintToolbar title={`Transcript · ${reference}`} />
      <article className="mx-auto max-w-3xl px-8 py-10 print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              MERITMUN III · Registration transcript
            </p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            <p className="font-mono text-sm">{reference}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{STATUS[status] ?? status}</p>
            <p className="text-neutral-500">
              Generated {formatAdminDate(new Date().toISOString())}
            </p>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">Registration</h2>
          <dl className="mt-2">
            {details.map((row) => (
              <Row key={row.label} {...row} />
            ))}
          </dl>
        </section>

        {roster.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide">Roster</h2>
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="py-1.5 pr-3 font-medium">Name</th>
                  <th className="py-1.5 pr-3 font-medium">Code</th>
                  <th className="py-1.5 pr-3 font-medium">Fee option</th>
                  <th className="py-1.5 pr-3 font-medium">Preferences</th>
                  <th className="py-1.5 font-medium">Seat</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((m) => (
                  <tr key={m.id} className="border-b border-neutral-200">
                    <td className="py-1.5 pr-3">
                      {m.fullName}
                      {m.isHeadDelegate ? " (head)" : ""}
                    </td>
                    <td className="py-1.5 pr-3 font-mono">{m.delegateCode}</td>
                    <td className="py-1.5 pr-3">{m.withSocial === false ? "No social" : "Social"}</td>
                    <td className="py-1.5 pr-3">{prefs(m)}</td>
                    <td className="py-1.5">{seatOf(m.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">Payment</h2>
          <dl className="mt-2">
            <Row label="Quoted fee" value={formatPkr(quoted)} />
            <Row
              label="Amount received"
              value={received != null ? formatPkr(received) : "Not confirmed"}
            />
            {received != null && discount !== 0 ? (
              <Row
                label={discount > 0 ? "Discount" : "Paid above quote"}
                value={formatPkr(Math.abs(discount))}
              />
            ) : null}
            <Row label="Note" value={note ?? "-"} />
            <Row
              label="Confirmed"
              value={confirmedAt ? formatAdminDateTime(confirmedAt) : "-"}
            />
            <Row label="Confirmed by" value={confirmedBy ?? "-"} />
          </dl>
        </section>

        <section className="mt-6 break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            Payment screenshot
          </h2>
          {proof && proofPath ? (
            isPdfProof(proofPath) ? (
              <p className="mt-2 text-sm">
                <a href={proof} target="_blank" rel="noreferrer" className="underline">
                  Open the attached PDF
                </a>
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img
                src={proof}
                alt={`Payment screenshot for ${reference}`}
                className="mt-2 max-h-[28rem] rounded border border-neutral-200 object-contain"
              />
            )
          ) : (
            <p className="mt-2 text-sm text-neutral-500">No screenshot attached.</p>
          )}
        </section>
      </article>
    </>
  );
}
