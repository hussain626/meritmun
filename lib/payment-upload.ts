import "server-only";
import { getDemoStore } from "@/lib/admin/demo-store";
import { getPricing, listBankAccounts } from "@/lib/admin/data";
import { owedForDelegate } from "@/lib/admin/fees";
import type { BankAccount, PaymentStatus } from "@/lib/admin/types";
import { readPaymentToken, type PaymentLinkKind } from "@/lib/payment-link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";

/** What the /pay page shows about the registration a link points at. */
export type PaymentTarget = {
  kind: PaymentLinkKind;
  id: string;
  name: string;
  /** Delegate code (individuals) or delegation reference: the payment reference. */
  code: string;
  amount: number | null;
  status: PaymentStatus;
  uploadedAt: string | null;
  accounts: BankAccount[];
};

type Row = Record<string, unknown>;

async function loadRow(kind: PaymentLinkKind, id: string): Promise<Row | null> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (kind === "delegate") {
      const d = store.delegates.find((x) => x.id === id);
      return d
        ? {
            full_name: d.fullName,
            delegate_code: d.delegateCode,
            delegation_id: d.delegationId,
            paid_by: d.paidBy ?? null,
            payment_status: d.paymentStatus,
            payment_proof_uploaded_at: d.paymentProofUploadedAt ?? null,
            _owed: owedForDelegate(d, store.pricing),
          }
        : null;
    }
    const g = store.delegations.find((x) => x.id === id);
    return g
      ? {
          institution_name: g.institutionName,
          reference: g.reference,
          payment_status: g.paymentStatus,
          payment_proof_uploaded_at: g.paymentProofUploadedAt ?? null,
          quoted_amount: g.quotedAmount,
        }
      : null;
  }

  // Registrants have no session; the service role reads just this one row.
  const client = createServiceClient();
  if (!client) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  const { data, error } = await client
    .from(kind === "delegate" ? "delegates" : "delegations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

/**
 * The registration behind a /pay link, or null when the link is invalid or
 * points at someone who does not pay directly (delegation members and
 * co-delegates are paid for by someone else).
 */
export async function loadPaymentTarget(token: string): Promise<PaymentTarget | null> {
  const ref = readPaymentToken(token);
  if (!ref) return null;
  const row = await loadRow(ref.kind, ref.id);
  if (!row) return null;
  if (ref.kind === "delegate" && (row.delegation_id || row.paid_by)) return null;

  let amount: number | null = null;
  if (typeof row._owed === "number") {
    amount = row._owed;
  } else if (typeof row.quoted_amount === "number") {
    amount = row.quoted_amount;
  } else if (ref.kind === "delegate") {
    const pricing = await getPricing().catch(() => null);
    amount = pricing ? pricing.delegateFee : null;
  }

  const accounts = (await listBankAccounts().catch(() => [])).filter((b) => b.isActive);
  return {
    kind: ref.kind,
    id: ref.id,
    name: String(ref.kind === "delegate" ? row.full_name : row.institution_name),
    code: String(ref.kind === "delegate" ? row.delegate_code : row.reference),
    amount,
    status: (row.payment_status as PaymentStatus) ?? "pending",
    uploadedAt:
      row.payment_proof_uploaded_at == null ? null : String(row.payment_proof_uploaded_at),
    accounts,
  };
}
