import "server-only";
import {
  getPricing,
  listDelegates,
  listDelegations,
  listTeamProfiles,
} from "@/lib/admin/data";
import { owedForDelegate, owedForDelegation } from "@/lib/admin/fees";
import type { PaymentStatus } from "@/lib/admin/types";

/** One payment: an individual registration (with any co-delegate) or a delegation. */
export type FinanceRow = {
  id: string;
  kind: "delegate" | "delegation";
  reference: string;
  payer: string;
  email: string;
  institution: string;
  /** e.g. "Individual", "Individual + co-delegate", "Delegation (12)". */
  typeLabel: string;
  status: PaymentStatus;
  quoted: number;
  received: number | null;
  /** Quoted minus received; positive is a discount. Null until confirmed. */
  discount: number | null;
  note: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  hasProof: boolean;
  registeredAt: string;
};

export type FinanceSummary = {
  received: number;
  discounts: number;
  confirmed: number;
  pending: number;
  pendingQuoted: number;
};

/**
 * Every payment the conference expects, with who confirmed it and for how
 * much. Delegation members and paid-for co-delegates are covered by their
 * registrant's row, so they are not listed twice.
 */
export async function listFinanceRows(): Promise<FinanceRow[]> {
  const [delegates, delegations, profiles, pricing] = await Promise.all([
    listDelegates(),
    listDelegations(),
    listTeamProfiles(),
    getPricing().catch(() => null),
  ]);
  const nameOf = new Map(profiles.map((p) => [p.id, p.fullName]));
  nameOf.set("demo-admin", "Demo Admin");
  const staffName = (id: string | null | undefined) =>
    id ? (nameOf.get(id) ?? "Former team member") : null;

  const rows: FinanceRow[] = [];

  for (const d of delegates) {
    if (d.delegationId || d.paidBy) continue;
    const coDelegates = delegates.filter((x) => x.paidBy === d.id).length;
    const quoted = pricing ? owedForDelegate(d, pricing) : (d.quotedAmount ?? 0);
    const received = d.paymentStatus === "confirmed" ? d.paymentAmount : null;
    rows.push({
      id: d.id,
      kind: "delegate",
      reference: d.reference,
      payer: d.fullName,
      email: d.email,
      institution: d.institution,
      typeLabel: coDelegates > 0 ? "Individual + co-delegate" : "Individual",
      status: d.paymentStatus,
      quoted,
      received,
      discount: received == null ? null : quoted - received,
      note: d.paymentNote ?? null,
      confirmedBy: staffName(d.paymentConfirmedBy),
      confirmedAt: d.paymentStatus === "confirmed" ? d.paymentConfirmedAt : null,
      hasProof: Boolean(d.paymentProofPath),
      registeredAt: d.createdAt,
    });
  }

  for (const g of delegations) {
    const members = delegates.filter((d) => d.delegationId === g.id);
    const quoted = pricing
      ? owedForDelegation(g, members, pricing)
      : (g.quotedAmount ?? 0);
    const received = g.paymentStatus === "confirmed" ? g.paymentAmount : null;
    rows.push({
      id: g.id,
      kind: "delegation",
      reference: g.reference,
      payer: `${g.institutionName} (${g.headName})`,
      email: g.headEmail,
      institution: g.institutionName,
      typeLabel: `Delegation (${members.length || g.delegationSize})`,
      status: g.paymentStatus,
      quoted,
      received,
      discount: received == null ? null : quoted - received,
      note: g.paymentNote ?? null,
      confirmedBy: staffName(g.paymentConfirmedBy),
      confirmedAt: g.paymentStatus === "confirmed" ? (g.paymentConfirmedAt ?? null) : null,
      hasProof: Boolean(g.paymentProofPath),
      registeredAt: g.createdAt,
    });
  }

  return rows.sort(
    (a, b) =>
      (b.confirmedAt ?? b.registeredAt).localeCompare(a.confirmedAt ?? a.registeredAt),
  );
}

export function summarise(rows: FinanceRow[]): FinanceSummary {
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const pending = rows.filter((r) => r.status === "pending");
  return {
    received: confirmed.reduce((sum, r) => sum + (r.received ?? 0), 0),
    discounts: confirmed.reduce((sum, r) => sum + Math.max(0, r.discount ?? 0), 0),
    confirmed: confirmed.length,
    pending: pending.length,
    pendingQuoted: pending.reduce((sum, r) => sum + r.quoted, 0),
  };
}
