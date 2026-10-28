"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ANNOUNCEMENT_MESSAGE_MAX,
  isSafeHttpUrl,
  isSafeInternalPath,
  type AnnouncementLinkType,
} from "@/lib/admin/announcement";
import { getDemoStore } from "@/lib/admin/demo-store";
import {
  clampPortfolioHardness,
  findExistingPortfolio,
  parseCountryList,
} from "@/lib/admin/portfolio-list";
import type {
  AdminRole,
  BankAccount,
  DelegateRecord,
  FeeType,
  Portfolio,
  PricingSettings,
} from "@/lib/admin/types";
import {
  getPricing,
  listBankAccounts,
  listDelegates,
  listDelegations,
  mapDelegateRow,
} from "@/lib/admin/data";
import { authorizeAction, getAdminSession } from "@/lib/admin/auth";
import {
  canRemoveTeamMembers,
  isTeamOwner,
  TEAM_OWNER_EMAIL,
} from "@/lib/admin/team";
import {
  deliveryNote,
  sendDelegationRegistrationConfirmation,
  sendPaymentConfirmed,
  sendQueryReply,
  sendBroadcast,
  sendRegistrationConfirmation,
} from "@/lib/email/send";
import { runMeritEngineAction } from "@/lib/admin/allotment-actions";
import {
  proofUrl,
  removeProof,
  saveProof,
  validateProof,
  type ProofKind,
} from "@/lib/admin/payment-proof";
import { owedAmount, owedAmountTotal } from "@/lib/admin/fees";
import { isP5Country } from "@/lib/merit/p5";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CommitteeType, Difficulty } from "@/lib/types";

function nowIso(): string {
  return new Date().toISOString();
}

function revalidateAdmin(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/allotments");
  revalidatePath("/admin/queries");
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/committees");
  revalidatePath("/admin/team");
}

export type SignInState = { message: string } | null;

function safeAdminNext(value: string | null): string {
  if (!value) return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value === "/admin/login" || value.startsWith("/admin/login?")) {
    return "/admin";
  }
  return value;
}

function mapSignInError(message: string, code?: string): string {
  const haystack = `${code ?? ""} ${message}`.toLowerCase();
  if (haystack.includes("email_not_confirmed") || haystack.includes("email not confirmed")) {
    return "This email is not confirmed yet. In Supabase open Authentication → Users, select this account, and confirm it. Then sign in again.";
  }
  if (
    haystack.includes("invalid_credentials") ||
    haystack.includes("invalid login")
  ) {
    return "Email or password is incorrect.";
  }
  return message;
}

export async function signInAdmin(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isSupabaseConfigured()) {
    redirect("/admin");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeAdminNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }

  const client = await createClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { message: mapSignInError(error.message, error.code) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { message: "Sign-in did not return a user session." };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    await client.auth.signOut();
    const missingTable = /does not exist|schema cache/i.test(
      profileError.message,
    );
    return {
      message: missingTable
        ? "Admin tables are not set up yet. Run supabase/migrations/001_admin_panel.sql in the Supabase SQL editor, then add your profile and try again."
        : `Could not load your admin profile (${profileError.message}).`,
    };
  }

  if (!profile) {
    await client.auth.signOut();
    return {
      message:
        "This account has no admin profile. After running migration 001, insert a public.profiles row for this user with role admin.",
    };
  }

  const role = String(profile.role);
  if (role !== "admin" && role !== "eb" && role !== "reviewer") {
    await client.auth.signOut();
    return { message: "This account is not allowed to use the admin panel." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  redirect(next);
}

export async function signOutAdmin(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const client = await createClient();
      await client.auth.signOut();
    } catch (error) {
      console.warn("[meritmun/admin] signOut failed", error);
    }
  }
  redirect("/admin/login");
}

/** Admin + EB run registrations, queries and content; reviewers only read. */
const STAFF: AdminRole[] = ["admin", "eb"];
/** Fees and bank accounts are admin-only (RLS: pricing/bank admin write). */
const ADMIN_ONLY: AdminRole[] = ["admin"];
/** Payments: admins, the EB and reviewers confirm or reject them. */
const PAYMENT_ROLES: AdminRole[] = ["admin", "eb", "reviewer"];

/**
 * Re-plan drafts after a payment so the newly paid delegates compete on merit
 * with everyone else still in draft (issued and manual seats never move).
 * Existing draft scores are reused, so only the new delegates are scored.
 * Payment stays confirmed even if this fails.
 */
async function queueMerit(
  delegateIds: string[],
  role: AdminRole = "admin",
): Promise<string> {
  if (delegateIds.length === 0) return "No delegates to allot.";
  // Reviewers confirm payments but do not run allotments.
  if (role === "reviewer") {
    return "An admin or EB member seats them on the next merit run.";
  }
  try {
    const result = await runMeritEngineAction({ reuseScores: true });
    return result.ok ? result.message : `Merit run did not complete: ${result.message}`;
  } catch (error) {
    console.warn("[meritmun/admin] queueMerit", error);
    return "Merit run did not complete, run it from Allotments.";
  }
}

const MEMBER_PAYMENT =
  "This delegate is part of a delegation, one payment covers the roster. Confirm or reject it from the Delegations tab.";

const COVERED_PAYMENT =
  "This co-delegate's fee is paid through the delegate who registered them. Confirm or reject that registration instead.";

/** Mark the co-delegates whose fee this registration paid (demo store). */
function confirmCoveredDemo(payerId: string, userId: string, stamp: string): string[] {
  const covered = getDemoStore().delegates.filter((d) => d.paidBy === payerId);
  for (const d of covered) {
    d.paymentStatus = "confirmed";
    d.paymentAmount = null;
    d.paymentConfirmedAt = stamp;
    d.paymentConfirmedBy = userId;
    d.paymentRejectedAt = null;
    d.rejectionReason = null;
    d.updatedAt = stamp;
  }
  return covered.map((d) => d.id);
}

/** Same for Supabase. Before migration 011 there is no paid_by column, so no co-delegates. */
async function updateCovered(
  client: Awaited<ReturnType<typeof createClient>>,
  payerId: string,
  patch: Record<string, unknown>,
): Promise<string[]> {
  const { data, error } = await client
    .from("delegates")
    .update(patch)
    .eq("paid_by", payerId)
    .select("id");
  if (error) {
    if (error.code === "42703" || /paid_by/i.test(error.message)) return [];
    throw error;
  }
  return (data ?? []).map((row) => String(row.id));
}

/** Payment rejected: free any seat the delegate held so it can be re-allotted. */
async function releaseSeats(
  client: Awaited<ReturnType<typeof createClient>>,
  delegateIds: string[],
): Promise<number> {
  if (delegateIds.length === 0) return 0;
  const { data, error } = await client
    .from("allotments")
    .delete()
    .in("delegate_id", delegateIds)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

function releasedNote(count: number): string {
  return count > 0
    ? ` ${count} seat${count === 1 ? " was" : "s were"} released for re-allotment.`
    : "";
}

/** Largest fee staff can record, to catch an extra zero typed by mistake. */
const MAX_PAYMENT = 1_000_000;

type ConfirmInput = {
  kind: ProofKind;
  id: string;
  /** Amount actually received, in PKR (may be below the quote for a discount). */
  amount: number;
  note: string | null;
  proof: File;
};

/** Parse and check the confirm form; returns the input or a reason it is invalid. */
function readConfirmForm(formData: FormData): ConfirmInput | string {
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "").trim();
  if ((kind !== "delegate" && kind !== "delegation") || !id) {
    return "Registration not found.";
  }
  const rawAmount = String(formData.get("amount") ?? "").replace(/[,\s]/g, "");
  if (!/^\d+$/.test(rawAmount)) {
    return "Enter the amount received in whole rupees.";
  }
  const amount = Number(rawAmount);
  if (amount > MAX_PAYMENT) {
    return `That amount is above PKR ${MAX_PAYMENT.toLocaleString("en-US")}, check for an extra zero.`;
  }
  const proof = formData.get("proof");
  const proofError = validateProof(proof);
  if (proofError) return proofError;
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  return { kind, id, amount, note, proof: proof as File };
}

/** A changed amount must say why, so Finance can reconcile it later. */
function amountNoteError(amount: number, owed: number, note: string | null): string | null {
  if (amount !== owed && !note) {
    return `The quoted fee is PKR ${owed.toLocaleString("en-US")}. Add a note explaining the different amount (for example the discount given).`;
  }
  return null;
}

function amountSummary(amount: number, owed: number): string {
  return amount === owed
    ? `PKR ${amount.toLocaleString("en-US")} recorded.`
    : `PKR ${amount.toLocaleString("en-US")} recorded (quoted PKR ${owed.toLocaleString("en-US")}).`;
}

function missingProofColumns(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return (
    e?.code === "PGRST204" ||
    e?.code === "42703" ||
    /payment_proof_path|payment_note|payment_confirmed_by/i.test(e?.message ?? "")
  );
}

const MIGRATION_009 =
  "Payment proofs are not set up yet. Run supabase/migrations/009_payment_proofs.sql in the Supabase SQL editor, then confirm again.";

/**
 * Confirm a payment. Staff must attach the transfer screenshot, and may record
 * a different amount than quoted (a discount) as long as they say why. One
 * payment covers a whole delegation: its members are confirmed with it.
 */
export async function confirmPayment(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(PAYMENT_ROLES, "confirm payments");
  if (!auth.ok) return auth;

  const input = readConfirmForm(formData);
  if (typeof input === "string") return { ok: false, message: input };

  return input.kind === "delegate"
    ? confirmDelegate(input, auth.session.user.id, auth.session.role)
    : confirmDelegation(input, auth.session.user.id, auth.session.role);
}

async function confirmDelegate(
  input: ConfirmInput,
  userId: string,
  role: AdminRole,
): Promise<{ ok: boolean; message: string }> {
  const { id, amount, note } = input;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegate = store.delegates.find((d) => d.id === id);
    if (!delegate) return { ok: false, message: "Delegate not found." };
    if (delegate.delegationId) return { ok: false, message: MEMBER_PAYMENT };
    if (delegate.paidBy) return { ok: false, message: COVERED_PAYMENT };
    if (delegate.paymentStatus === "confirmed") {
      return { ok: false, message: "This payment is already confirmed." };
    }
    const owed = owedAmount(delegate.quotedAmount, delegate.feeType, store.pricing, delegate.withSocial ?? true);
    const noteError = amountNoteError(amount, owed, note);
    if (noteError) return { ok: false, message: noteError };

    const proofPath = await saveProof("delegate", id, input.proof);
    delegate.paymentStatus = "confirmed";
    delegate.paymentAmount = amount;
    delegate.paymentProofPath = proofPath;
    delegate.paymentNote = note;
    delegate.paymentConfirmedAt = nowIso();
    delegate.paymentConfirmedBy = userId;
    delegate.paymentRejectedAt = null;
    delegate.rejectionReason = null;
    delegate.updatedAt = nowIso();
    const covered = confirmCoveredDemo(id, userId, nowIso());

    const sent = await sendPaymentConfirmed({
      to: delegate.email,
      fullName: delegate.fullName,
      reference: delegate.reference,
      amount,
    });
    const merit = await queueMerit([id, ...covered], role);

    revalidateAdmin();
    return {
      ok: true,
      message: `Payment confirmed (demo). ${amountSummary(amount, owed)} ${deliveryNote(sent)} ${merit}`,
    };
  }

  let confirmed = false;
  let proofPath: string | null = null;
  try {
    const client = await createClient();
    const pricing = await getPricing();
    const { data: delegate, error: fetchError } = await client
      .from("delegates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!delegate) return { ok: false, message: "Delegate not found." };
    if (delegate.delegation_id) return { ok: false, message: MEMBER_PAYMENT };
    if (delegate.paid_by) return { ok: false, message: COVERED_PAYMENT };
    if (delegate.payment_status === "confirmed") {
      return { ok: false, message: "This payment is already confirmed." };
    }
    const owed = owedAmount(delegate.quoted_amount, delegate.fee_type as FeeType, pricing, delegate.with_social !== false);
    const noteError = amountNoteError(amount, owed, note);
    if (noteError) return { ok: false, message: noteError };

    proofPath = await saveProof("delegate", id, input.proof);

    // `.select()` returns the rows actually changed: RLS can turn an UPDATE
    // into a silent no-op, and nobody must be emailed "confirmed" then.
    const { data: updated, error } = await client
      .from("delegates")
      .update({
        payment_status: "confirmed",
        payment_amount: amount,
        payment_proof_path: proofPath,
        payment_note: note,
        payment_confirmed_by: userId,
        payment_confirmed_at: nowIso(),
        payment_rejected_at: null,
        rejection_reason: null,
        updated_at: nowIso(),
      })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!updated?.length) {
      await removeProof(proofPath);
      return { ok: false, message: "You do not have permission to confirm payments." };
    }
    confirmed = true;
    const covered = await updateCovered(client, id, {
      payment_status: "confirmed",
      payment_amount: null,
      payment_confirmed_by: userId,
      payment_confirmed_at: nowIso(),
      payment_rejected_at: null,
      rejection_reason: null,
      updated_at: nowIso(),
    });

    const sent = await sendPaymentConfirmed({
      to: String(delegate.email),
      fullName: String(delegate.full_name),
      reference: String(delegate.reference),
      amount,
      related: { type: "delegate", id },
    });
    const merit = await queueMerit([id, ...covered], role);

    revalidateAdmin();
    return {
      ok: true,
      message: `Payment confirmed. ${amountSummary(amount, owed)} ${deliveryNote(sent)} ${merit}`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] confirmDelegate", error);
    if (!confirmed && proofPath) await removeProof(proofPath);
    revalidateAdmin();
    if (confirmed) {
      return {
        ok: true,
        message: "Payment confirmed, but a follow-up step failed, check the email log and run merit from Allotments.",
      };
    }
    if (missingProofColumns(error) || isMissingBucket(error)) {
      return { ok: false, message: MIGRATION_009 };
    }
    return { ok: false, message: "Could not confirm payment." };
  }
}

async function confirmDelegation(
  input: ConfirmInput,
  userId: string,
  role: AdminRole,
): Promise<{ ok: boolean; message: string }> {
  const { id, amount, note } = input;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegation = store.delegations.find((d) => d.id === id);
    if (!delegation) return { ok: false, message: "Delegation not found." };
    if (delegation.paymentStatus === "confirmed") {
      return { ok: false, message: "This payment is already confirmed." };
    }
    const members = store.delegates.filter((d) => d.delegationId === id);
    const owed = owedAmountTotal(
      delegation.quotedAmount,
      members.reduce(
        (sum, m) => sum + owedAmount(m.quotedAmount, m.feeType, store.pricing, m.withSocial ?? true),
        0,
      ) + store.pricing.delegationFee,
    );
    const noteError = amountNoteError(amount, owed, note);
    if (noteError) return { ok: false, message: noteError };

    const proofPath = await saveProof("delegation", id, input.proof);
    const stamp = nowIso();
    for (const member of members) {
      member.paymentStatus = "confirmed";
      member.paymentAmount = owedAmount(member.quotedAmount, member.feeType, store.pricing, member.withSocial ?? true);
      member.paymentConfirmedAt = stamp;
      member.paymentConfirmedBy = userId;
      member.paymentRejectedAt = null;
      member.rejectionReason = null;
      member.updatedAt = stamp;
    }
    delegation.paymentStatus = "confirmed";
    delegation.paymentAmount = amount;
    delegation.paymentProofPath = proofPath;
    delegation.paymentNote = note;
    delegation.paymentConfirmedAt = stamp;
    delegation.paymentConfirmedBy = userId;
    delegation.updatedAt = stamp;

    const sent = await sendPaymentConfirmed({
      to: delegation.headEmail,
      fullName: delegation.headName,
      reference: delegation.reference,
      amount,
    });
    const merit = members.length
      ? await queueMerit(members.map((m) => m.id), role)
      : "No roster members to allot.";

    revalidateAdmin();
    return {
      ok: true,
      message: `Delegation confirmed with ${members.length} member${members.length === 1 ? "" : "s"} (demo). ${amountSummary(amount, owed)} ${deliveryNote(sent)} ${merit}`,
    };
  }

  let confirmed = false;
  let proofPath: string | null = null;
  try {
    const client = await createClient();
    const pricing = await getPricing();
    const { data: delegation, error: fetchError } = await client
      .from("delegations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!delegation) return { ok: false, message: "Delegation not found." };
    if (delegation.payment_status === "confirmed") {
      return { ok: false, message: "This payment is already confirmed." };
    }

    const { data: members, error: membersError } = await client
      .from("delegates")
      .select("*")
      .eq("delegation_id", id);
    if (membersError) throw membersError;

    const memberAmounts = (members ?? []).map((m) => ({
      id: String(m.id),
      amount: owedAmount(m.quoted_amount, m.fee_type as FeeType, pricing, m.with_social !== false),
    }));
    const owed = owedAmountTotal(
      delegation.quoted_amount,
      memberAmounts.reduce((sum, m) => sum + m.amount, 0) + pricing.delegationFee,
    );
    const noteError = amountNoteError(amount, owed, note);
    if (noteError) return { ok: false, message: noteError };

    proofPath = await saveProof("delegation", id, input.proof);

    const stamp = nowIso();
    // The delegation row carries the whole payment (what was actually
    // received); revenue KPIs count this row, not its members.
    const { data: updatedDelegation, error } = await client
      .from("delegations")
      .update({
        payment_status: "confirmed",
        payment_amount: amount,
        payment_proof_path: proofPath,
        payment_note: note,
        payment_confirmed_by: userId,
        payment_confirmed_at: stamp,
        updated_at: stamp,
      })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!updatedDelegation?.length) {
      await removeProof(proofPath);
      return { ok: false, message: "You do not have permission to confirm payments." };
    }
    confirmed = true;

    for (const member of memberAmounts) {
      const { error: memberError } = await client
        .from("delegates")
        .update({
          payment_status: "confirmed",
          payment_amount: member.amount,
          payment_confirmed_at: stamp,
          payment_rejected_at: null,
          rejection_reason: null,
          updated_at: stamp,
        })
        .eq("id", member.id);
      if (memberError) throw memberError;
    }

    const sent = await sendPaymentConfirmed({
      to: String(delegation.head_email),
      fullName: String(delegation.head_name),
      reference: String(delegation.reference),
      amount,
      related: { type: "delegation", id },
    });
    const memberIds = memberAmounts.map((m) => m.id);
    const merit = memberIds.length
      ? await queueMerit(memberIds, role)
      : "No roster members to allot.";

    revalidateAdmin();
    return {
      ok: true,
      message: `Delegation confirmed with ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}. ${amountSummary(amount, owed)} ${deliveryNote(sent)} ${merit}`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] confirmDelegation", error);
    if (!confirmed && proofPath) await removeProof(proofPath);
    revalidateAdmin();
    if (confirmed) {
      return {
        ok: false,
        message: "The delegation was marked confirmed, but updating its members failed. Ask an admin to check the roster.",
      };
    }
    if (missingProofColumns(error) || isMissingBucket(error)) {
      return { ok: false, message: MIGRATION_009 };
    }
    return { ok: false, message: "Could not confirm the delegation payment." };
  }
}

function isMissingBucket(error: unknown): boolean {
  const e = error as { message?: string; statusCode?: string | number } | null;
  return /bucket not found/i.test(e?.message ?? "");
}

/** Short-lived link to view a confirmed payment's screenshot. */
export async function getPaymentProofUrl(
  kind: ProofKind,
  id: string,
): Promise<{ ok: boolean; message: string; url?: string }> {
  const auth = await authorizeAction(PAYMENT_ROLES, "view payment proofs");
  if (!auth.ok) return auth;

  let path: string | null | undefined;
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    path =
      kind === "delegate"
        ? store.delegates.find((d) => d.id === id)?.paymentProofPath
        : store.delegations.find((d) => d.id === id)?.paymentProofPath;
  } else {
    const client = await createClient();
    const { data, error } = await client
      .from(kind === "delegate" ? "delegates" : "delegations")
      .select("payment_proof_path")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        message: missingProofColumns(error) ? MIGRATION_009 : "Could not load the proof.",
      };
    }
    path = data?.payment_proof_path == null ? null : String(data.payment_proof_path);
  }

  if (!path) return { ok: false, message: "No payment screenshot is attached." };
  const url = await proofUrl(path);
  return url
    ? { ok: true, message: "Opened.", url }
    : { ok: false, message: "The screenshot could not be found in storage." };
}

export async function rejectDelegationPayment(
  id: string,
  reason?: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(PAYMENT_ROLES, "reject payments");
  if (!auth.ok) return auth;

  const rejection = reason?.trim() || "Rejected by admin.";
  const stamp = nowIso();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegation = store.delegations.find((d) => d.id === id);
    if (!delegation) return { ok: false, message: "Delegation not found." };
    delegation.paymentStatus = "rejected";
    delegation.paymentAmount = null;
    delegation.updatedAt = stamp;
    const memberIds = new Set<string>();
    for (const member of store.delegates.filter((d) => d.delegationId === id)) {
      member.paymentStatus = "rejected";
      member.paymentAmount = null;
      member.paymentRejectedAt = stamp;
      member.rejectionReason = rejection;
      member.paymentConfirmedAt = null;
      member.updatedAt = stamp;
      memberIds.add(member.id);
    }
    const before = store.allotments.length;
    store.allotments = store.allotments.filter((a) => !memberIds.has(a.delegateId));
    revalidateAdmin();
    return {
      ok: true,
      message: `Delegation payment rejected (demo).${releasedNote(before - store.allotments.length)}`,
    };
  }

  try {
    const client = await createClient();
    const { data: updated, error } = await client
      .from("delegations")
      .update({ payment_status: "rejected", payment_amount: null, updated_at: stamp })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!updated?.length) {
      return { ok: false, message: "Delegation not found, or you cannot change payments." };
    }
    const { data: members, error: membersError } = await client
      .from("delegates")
      .update({
        payment_status: "rejected",
        payment_amount: null,
        payment_rejected_at: stamp,
        rejection_reason: rejection,
        payment_confirmed_at: null,
        updated_at: stamp,
      })
      .eq("delegation_id", id)
      .select("id");
    if (membersError) throw membersError;
    const released = await releaseSeats(
      client,
      (members ?? []).map((m) => String(m.id)),
    );
    revalidateAdmin();
    return {
      ok: true,
      message: `Delegation payment rejected.${releasedNote(released)}`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] rejectDelegationPayment", error);
    return { ok: false, message: "Could not reject the delegation payment." };
  }
}

export async function rejectDelegatePayment(
  id: string,
  reason?: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(PAYMENT_ROLES, "reject payments");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegate = store.delegates.find((d) => d.id === id);
    if (!delegate) {
      return { ok: false, message: "Delegate not found." };
    }
    if (delegate.delegationId) return { ok: false, message: MEMBER_PAYMENT };
    if (delegate.paidBy) return { ok: false, message: COVERED_PAYMENT };
    const group = [
      delegate,
      ...store.delegates.filter((d) => d.paidBy === id),
    ];
    for (const d of group) {
      d.paymentStatus = "rejected";
      d.paymentAmount = null;
      d.paymentRejectedAt = nowIso();
      d.rejectionReason = reason?.trim() || "Rejected by admin.";
      d.paymentConfirmedAt = null;
      d.updatedAt = nowIso();
    }
    const groupIds = new Set(group.map((d) => d.id));
    const before = store.allotments.length;
    store.allotments = store.allotments.filter((a) => !groupIds.has(a.delegateId));
    revalidateAdmin();
    return {
      ok: true,
      message: `Payment rejected (demo).${releasedNote(before - store.allotments.length)}`,
    };
  }

  try {
    const client = await createClient();
    const { data: delegate, error: fetchError } = await client
      .from("delegates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!delegate) return { ok: false, message: "Delegate not found." };
    if (delegate.delegation_id) return { ok: false, message: MEMBER_PAYMENT };
    if (delegate.paid_by) return { ok: false, message: COVERED_PAYMENT };

    const { data: updated, error } = await client
      .from("delegates")
      .update({
        payment_status: "rejected",
        payment_amount: null,
        payment_rejected_at: nowIso(),
        rejection_reason: reason?.trim() || "Rejected by admin.",
        payment_confirmed_at: null,
        updated_at: nowIso(),
      })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!updated?.length) {
      return { ok: false, message: "You do not have permission to reject payments." };
    }
    const covered = await updateCovered(client, id, {
      payment_status: "rejected",
      payment_amount: null,
      payment_rejected_at: nowIso(),
      rejection_reason: reason?.trim() || "Rejected by admin.",
      payment_confirmed_at: null,
      updated_at: nowIso(),
    });
    const released = await releaseSeats(client, [id, ...covered]);
    revalidateAdmin();
    return { ok: true, message: `Payment rejected.${releasedNote(released)}` };
  } catch (error) {
    console.warn("[meritmun/admin] rejectDelegatePayment", error);
    return { ok: false, message: "Could not reject payment." };
  }
}

/**
 * Re-send the registration email with the bank details. A delegation member's
 * registration is the delegation's, so the head gets the delegation email.
 */
export async function resendRegistrationEmail(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "resend emails");
  if (!auth.ok) return auth;

  try {
    const [pricing, banks] = await Promise.all([getPricing(), listBankAccounts()]);
    const active = banks.filter((b) => b.isActive);
    const store = isSupabaseConfigured() ? null : getDemoStore();

    let delegate: DelegateRecord | undefined;
    if (store) {
      delegate = store.delegates.find((d) => d.id === id);
    } else {
      const client = await createClient();
      const { data, error } = await client
        .from("delegates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) delegate = mapDelegateRow(data as Record<string, unknown>);
    }
    if (!delegate) return { ok: false, message: "Delegate not found." };

    if (!delegate.delegationId) {
      const sent = await sendRegistrationConfirmation({
        to: delegate.email,
        fullName: delegate.fullName,
        reference: delegate.reference,
        delegateCode: delegate.delegateCode,
        feeAmount: owedAmount(delegate.quotedAmount, delegate.feeType, pricing, delegate.withSocial ?? true),
        currency: pricing.currency,
        bankAccounts: active,
        related: { type: "delegate", id },
      });
      return { ok: sent.ok, message: deliveryNote(sent) };
    }

    const delegations = await listDelegations();
    const delegation = delegations.find((d) => d.id === delegate.delegationId);
    if (!delegation) return { ok: false, message: "Delegation not found." };
    const roster = (await listDelegates()).filter(
      (d) => d.delegationId === delegation.id,
    );
    const total = owedAmountTotal(
      delegation.quotedAmount,
      roster.reduce((sum, m) => sum + owedAmount(m.quotedAmount, m.feeType, pricing, m.withSocial ?? true), 0) +
        pricing.delegationFee,
    );
    const sent = await sendDelegationRegistrationConfirmation({
      to: delegation.headEmail,
      headName: delegation.headName,
      institutionName: delegation.institutionName,
      reference: delegation.reference,
      members: roster.map((m) => ({ fullName: m.fullName, delegateCode: m.delegateCode })),
      feeAmount: total,
      currency: pricing.currency,
      bankAccounts: active,
      related: { type: "delegation", id: delegation.id },
    });
    return {
      ok: sent.ok,
      message: `Delegation email to ${delegation.headEmail}: ${deliveryNote(sent)}`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] resendRegistrationEmail", error);
    return { ok: false, message: "Could not resend the registration email." };
  }
}

/** Email the reply to the person who asked, then mark the query answered. */
export async function replyToQuery(
  id: string,
  body: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "reply to queries");
  if (!auth.ok) return auth;

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, message: "Reply body is required." };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const query = store.queries.find((q) => q.id === id);
    if (!query) {
      return { ok: false, message: "Query not found." };
    }
    const sent = await sendQueryReply({
      to: query.email,
      name: query.name,
      subject: query.subject,
      replyBody: trimmed,
    });
    if (!sent.ok) return { ok: false, message: deliveryNote(sent) };
    query.replyBody = trimmed;
    query.status = "answered";
    query.repliedAt = nowIso();
    query.repliedBy = "demo-admin";
    revalidateAdmin();
    return { ok: true, message: `Reply saved (demo). ${deliveryNote(sent)}` };
  }

  try {
    const client = await createClient();
    const { data: query, error: fetchError } = await client
      .from("queries")
      .select("id, name, email, subject")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!query) return { ok: false, message: "Query not found." };

    // Send first: a query is only "answered" once the reply has left.
    const sent = await sendQueryReply({
      to: String(query.email),
      name: String(query.name),
      subject: String(query.subject),
      replyBody: trimmed,
      related: { type: "query", id },
    });
    if (!sent.ok) return { ok: false, message: deliveryNote(sent) };

    const { error } = await client
      .from("queries")
      .update({
        reply_body: trimmed,
        status: "answered",
        replied_at: nowIso(),
        replied_by: auth.session.user.id,
      })
      .eq("id", id);
    if (error) throw error;
    revalidateAdmin();
    return { ok: true, message: `Reply saved. ${deliveryNote(sent)}` };
  } catch (error) {
    console.warn("[meritmun/admin] replyToQuery", error);
    return { ok: false, message: "Could not send reply." };
  }
}

/** Archive a query (or reopen one) so the inbox only shows live threads. */
export async function setQueryArchived(
  id: string,
  archived: boolean,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "archive queries");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const query = getDemoStore().queries.find((q) => q.id === id);
    if (!query) return { ok: false, message: "Query not found." };
    query.status = archived ? "archived" : query.replyBody ? "answered" : "open";
    revalidateAdmin();
    return { ok: true, message: archived ? "Query archived (demo)." : "Query reopened (demo)." };
  }

  try {
    const client = await createClient();
    const { data: query, error: fetchError } = await client
      .from("queries")
      .select("reply_body")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!query) return { ok: false, message: "Query not found." };
    const { error } = await client
      .from("queries")
      .update({
        status: archived ? "archived" : query.reply_body ? "answered" : "open",
      })
      .eq("id", id);
    if (error) throw error;
    revalidateAdmin();
    return { ok: true, message: archived ? "Query archived." : "Query reopened." };
  } catch (error) {
    console.warn("[meritmun/admin] setQueryArchived", error);
    return { ok: false, message: "Could not update the query." };
  }
}

export type PricingSaveInput = Omit<
  PricingSettings,
  "id" | "updatedAt" | "updatedBy"
>;

/** Pricing feeds the public site and registration emails, so revalidate both. */
function revalidatePricing(): void {
  revalidateAdmin();
  revalidatePath("/", "layout");
}

export async function savePricing(
  data: PricingSaveInput,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(ADMIN_ONLY, "change pricing");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.pricing = {
      ...store.pricing,
      ...data,
      currency: "PKR",
      updatedAt: nowIso(),
      updatedBy: "demo-admin",
    };
    revalidatePricing();
    return { ok: true, message: "Pricing saved (demo)." };
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("pricing_settings")
      .upsert({
        id: 1,
        currency: "PKR",
        delegate_fee: data.delegateFee,
        delegate_fee_no_social: data.delegateFeeNoSocial,
        delegation_fee: data.delegationFee,
        per_delegate_fee: data.perDelegateFee,
        per_delegate_fee_no_social: data.perDelegateFeeNoSocial,
        delegation_min: data.delegationMin,
        delegation_max: data.delegationMax,
        early_bird_enabled: data.earlyBirdEnabled,
        early_bird_delegate_fee: data.earlyBirdDelegateFee,
        early_bird_delegate_fee_no_social: data.earlyBirdDelegateFeeNoSocial,
        early_bird_per_delegate_fee: data.earlyBirdPerDelegateFee,
        early_bird_per_delegate_fee_no_social: data.earlyBirdPerDelegateFeeNoSocial,
        early_bird_ends_at: data.earlyBirdEndsAt,
        payment_contact_numbers: data.paymentContacts,
        updated_at: nowIso(),
        updated_by: auth.session.user.id,
      });
    if (error) throw error;
    revalidatePricing();
    return { ok: true, message: "Pricing saved." };
  } catch (error) {
    console.warn("[meritmun/admin] savePricing", error);
    return { ok: false, message: "Could not save pricing." };
  }
}

export async function upsertBankAccount(
  input: Omit<BankAccount, "createdAt"> & { createdAt?: string },
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(ADMIN_ONLY, "change bank accounts");
  if (!auth.ok) return auth;

  const bankName = input.bankName.trim();
  const accountTitle = input.accountTitle.trim();
  const accountNumber = input.accountNumber.trim();
  if (!bankName || !accountTitle || !accountNumber) {
    return {
      ok: false,
      message: "Bank name, account title and account number are required.",
    };
  }
  const optional = (value: string | null) => value?.trim() || null;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const existing = store.bankAccounts.findIndex((b) => b.id === input.id);
    const row: BankAccount = {
      id: input.id,
      bankName,
      accountTitle,
      accountNumber,
      iban: optional(input.iban),
      branch: optional(input.branch),
      instructions: optional(input.instructions),
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      createdAt: input.createdAt ?? nowIso(),
    };
    if (existing >= 0) {
      store.bankAccounts[existing] = row;
    } else {
      store.bankAccounts.push(row);
    }
    store.bankAccounts.sort((a, b) => a.sortOrder - b.sortOrder);
    revalidateAdmin();
    return { ok: true, message: "Bank account saved (demo)." };
  }

  try {
    const client = await createClient();
    const { data, error } = await client
      .from("bank_accounts")
      .upsert({
        id: input.id,
        bank_name: bankName,
        account_title: accountTitle,
        account_number: accountNumber,
        iban: optional(input.iban),
        branch: optional(input.branch),
        instructions: optional(input.instructions),
        is_active: input.isActive,
        sort_order: input.sortOrder,
      })
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      return { ok: false, message: "You do not have permission to change bank accounts." };
    }
    revalidateAdmin();
    return { ok: true, message: "Bank account saved." };
  } catch (error) {
    console.warn("[meritmun/admin] upsertBankAccount", error);
    return { ok: false, message: "Could not save the bank account." };
  }
}

export async function deleteBankAccount(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(ADMIN_ONLY, "change bank accounts");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.bankAccounts = store.bankAccounts.filter((b) => b.id !== id);
    revalidateAdmin();
    return { ok: true, message: "Bank account removed (demo)." };
  }

  try {
    const client = await createClient();
    const { data, error } = await client
      .from("bank_accounts")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      return { ok: false, message: "Bank account not found, or you cannot remove it." };
    }
    revalidateAdmin();
    return { ok: true, message: "Bank account removed." };
  } catch (error) {
    console.warn("[meritmun/admin] deleteBankAccount", error);
    return { ok: false, message: "Could not remove the bank account." };
  }
}

export async function createTeamMember(input: {
  email: string;
  role: "admin" | "eb" | "reviewer";
  fullName: string;
  password: string;
}): Promise<{ ok: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return { ok: false, message: "Only admins can create team accounts." };
  }

  const trimmedEmail = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const password = input.password;
  const role = input.role;

  if (!trimmedEmail) {
    return { ok: false, message: "Email is required." };
  }
  if (!fullName) {
    return { ok: false, message: "Name is required." };
  }
  if (role !== "admin" && role !== "eb" && role !== "reviewer") {
    return { ok: false, message: "Choose a valid role." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (store.teamProfiles.some((p) => p.email === trimmedEmail)) {
      return { ok: false, message: "That email is already on the team." };
    }
    store.teamProfiles.push({
      id: `profile-${Date.now()}`,
      email: trimmedEmail,
      fullName,
      role,
      avatarUrl: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    revalidatePath("/admin/team");
    return { ok: true, message: "Account created (demo)." };
  }

  const service = createServiceClient();
  if (!service) {
    return {
      ok: false,
      message:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env (Supabase → Project Settings → API) so this page can create logins.",
    };
  }

  try {
    const { data, error } = await service.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes("already") || text.includes("registered")) {
        return { ok: false, message: "That email already has an account." };
      }
      return { ok: false, message: error.message };
    }

    const userId = data.user?.id;
    if (!userId) {
      return { ok: false, message: "Auth created the user but returned no id." };
    }

    const { error: profileError } = await service.from("profiles").upsert({
      id: userId,
      email: trimmedEmail,
      full_name: fullName,
      role,
    });
    if (profileError) {
      console.warn("[meritmun/admin] createTeamMember profile", profileError);
      // Undo the login so a retry does not hit "email already has an account".
      const { error: cleanupError } = await service.auth.admin.deleteUser(userId);
      if (cleanupError) {
        console.warn("[meritmun/admin] createTeamMember cleanup", cleanupError);
      }
      return {
        ok: false,
        message: `Saving the admin profile failed, so the login was not kept: ${profileError.message}.${
          /permission denied/i.test(profileError.message)
            ? " Run supabase/migrations/007_service_role_grants.sql in the Supabase SQL editor."
            : ""
        }`,
      };
    }

    revalidatePath("/admin/team");
    return {
      ok: true,
      message: `${fullName} can sign in at /admin/login with this email and password.`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] createTeamMember", error);
    const reason = error instanceof Error ? error.message : "unknown error";
    return { ok: false, message: `Could not create the account: ${reason}.` };
  }
}

/** Audit columns that point at a profile; cleared so the delete is not blocked. */
const PROFILE_REFERENCES: { table: string; column: string }[] = [
  { table: "pricing_settings", column: "updated_by" },
  { table: "announcement_settings", column: "updated_by" },
  { table: "conference_settings", column: "updated_by" },
  { table: "allotment_rules", column: "updated_by" },
  { table: "allotments", column: "confirmed_by" },
  { table: "queries", column: "replied_by" },
  { table: "delegate_attendance", column: "marked_by" },
];

/**
 * Permanently remove a team member's login. Restricted to the team owner
 * (`TEAM_OWNER_EMAIL`); nobody can remove themselves.
 */
export async function removeTeamMember(
  profileId: string,
): Promise<{ ok: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session || !canRemoveTeamMembers(session.user.email)) {
    return {
      ok: false,
      message: `Only ${TEAM_OWNER_EMAIL} can remove team members.`,
    };
  }
  if (profileId === session.user.id) {
    return { ok: false, message: "You cannot remove your own account." };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const member = store.teamProfiles.find((p) => p.id === profileId);
    if (!member) return { ok: false, message: "Team member not found." };
    if (isTeamOwner(member.email)) {
      return { ok: false, message: "The team owner cannot be removed." };
    }
    store.teamProfiles = store.teamProfiles.filter((p) => p.id !== profileId);
    revalidatePath("/admin/team");
    return { ok: true, message: `${member.fullName} was removed (demo).` };
  }

  const service = createServiceClient();
  if (!service) {
    return {
      ok: false,
      message:
        "Add SUPABASE_SERVICE_ROLE_KEY to the environment so this page can remove logins.",
    };
  }

  try {
    const { data: member, error: fetchError } = await service
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", profileId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!member) return { ok: false, message: "Team member not found." };
    if (isTeamOwner(String(member.email))) {
      return { ok: false, message: "The team owner cannot be removed." };
    }

    for (const ref of PROFILE_REFERENCES) {
      const { error } = await service
        .from(ref.table)
        .update({ [ref.column]: null })
        .eq(ref.column, profileId);
      // A missing table (migration not run yet) holds no references.
      if (error && error.code !== "42P01" && error.code !== "PGRST205") {
        throw error;
      }
    }

    // Deleting the auth user cascades to public.profiles.
    const { error } = await service.auth.admin.deleteUser(profileId);
    if (error) throw error;

    revalidatePath("/admin/team");
    return {
      ok: true,
      message: `${String(member.full_name)} was removed and can no longer sign in.`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] removeTeamMember", error);
    // Owner-only action, so surfacing the database reason is safe and useful.
    const reason =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "unknown error";
    const hint = /permission denied/i.test(reason)
      ? " Run supabase/migrations/007_service_role_grants.sql in the Supabase SQL editor."
      : "";
    return {
      ok: false,
      message: `Could not remove the team member: ${reason}.${hint}`,
    };
  }
}

export async function saveCommitteeFields(
  id: string,
  patch: Partial<{
    name: string;
    abbr: string;
    agenda: string;
    overview: string;
    seats: number;
    hardnessScore: number;
    featured: boolean;
    isPublished: boolean;
    type: CommitteeType;
    difficulty: Difficulty;
    focusPoints: string[];
    studyGuideUrl: string | null;
    isDoubleDelegate: boolean;
  }>,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "edit committees");
  if (!auth.ok) return auth;

  if (patch.studyGuideUrl && !isSafeHttpUrl(patch.studyGuideUrl)) {
    return { ok: false, message: "The study guide link must start with https://." };
  }
  if (patch.focusPoints) {
    patch = {
      ...patch,
      focusPoints: patch.focusPoints.map((p) => p.trim()).filter(Boolean),
    };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const committee = store.committees.find((c) => c.id === id);
    if (!committee) {
      return { ok: false, message: "Committee not found." };
    }
    Object.assign(committee, patch, { updatedAt: nowIso() });
    revalidatePath("/admin/committees");
    revalidatePath(`/admin/committees/${id}`);
    revalidatePath("/", "layout");
    return { ok: true, message: "Committee saved (demo)." };
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("committees")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.abbr !== undefined ? { abbr: patch.abbr } : {}),
        ...(patch.agenda !== undefined ? { agenda: patch.agenda } : {}),
        ...(patch.overview !== undefined ? { overview: patch.overview } : {}),
        ...(patch.seats !== undefined ? { seats: patch.seats } : {}),
        ...(patch.hardnessScore !== undefined
          ? { hardness_score: patch.hardnessScore }
          : {}),
        ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
        ...(patch.isPublished !== undefined
          ? { is_published: patch.isPublished }
          : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.difficulty !== undefined ? { difficulty: patch.difficulty } : {}),
        ...(patch.focusPoints !== undefined
          ? { focus_points: patch.focusPoints }
          : {}),
        ...(patch.studyGuideUrl !== undefined
          ? { study_guide_url: patch.studyGuideUrl }
          : {}),
        ...(patch.isDoubleDelegate !== undefined
          ? { is_double_delegate: patch.isDoubleDelegate }
          : {}),
        updated_at: nowIso(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/committees");
    revalidatePath(`/admin/committees/${id}`);
    revalidatePath("/", "layout");
    return { ok: true, message: "Committee saved." };
  } catch (error) {
    console.warn("[meritmun/admin] saveCommitteeFields", error);
    return { ok: false, message: "Could not save the committee." };
  }
}

function revalidateCommittee(id: string): void {
  revalidatePath("/admin/committees");
  revalidatePath(`/admin/committees/${id}`);
  revalidatePath("/admin/allotments");
}

function summarizePortfolioAdds(input: {
  added: number;
  reactivated: number;
  skipped: number;
  p5Count: number;
}): string {
  const { added, reactivated, skipped, p5Count } = input;
  if (added === 0 && reactivated === 0) {
    return skipped > 0
      ? "Those countries are already on this committee's allotment list."
      : "Add at least one country.";
  }

  const parts: string[] = [];
  if (added > 0) {
    parts.push(`Added ${added} ${added === 1 ? "country" : "countries"}`);
  }
  if (reactivated > 0) {
    parts.push(
      `reactivated ${reactivated} ${reactivated === 1 ? "country" : "countries"}`,
    );
  }
  if (skipped > 0) {
    parts.push(`skipped ${skipped} already listed`);
  }
  let message = parts.join("; ") + ".";
  if (p5Count > 0) {
    message += ` ${p5Count} P5, merit will not auto-assign ${p5Count === 1 ? "that seat" : "those seats"}.`;
  }
  return message;
}

function mapPortfolioRow(row: Record<string, unknown>): Portfolio {
  return {
    id: String(row.id),
    committeeId: String(row.committee_id),
    countryName: String(row.country_name),
    isP5: Boolean(row.is_p5),
    hardness: Number(row.hardness),
    notes: row.notes == null ? null : String(row.notes),
    isActive: Boolean(row.is_active),
  };
}

export async function addPortfolios(
  committeeId: string,
  input: { rawList: string; hardness?: number; notes?: string },
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "edit country lists");
  if (!auth.ok) return auth;

  const names = parseCountryList(input.rawList);
  if (names.length === 0) {
    return { ok: false, message: "Add at least one country." };
  }

  const hardness = clampPortfolioHardness(input.hardness ?? 5);
  const notes = input.notes?.trim() ? input.notes.trim() : null;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const committee = store.committees.find((c) => c.id === committeeId);
    if (!committee) {
      return { ok: false, message: "Committee not found." };
    }

    const existing = store.portfolios.filter((p) => p.committeeId === committeeId);
    let added = 0;
    let reactivated = 0;
    let skipped = 0;
    let p5Count = 0;

    for (const countryName of names) {
      const match = findExistingPortfolio(existing, countryName);
      const isP5 = isP5Country(match?.countryName ?? countryName);
      if (match) {
        if (match.isActive) {
          skipped += 1;
          continue;
        }
        match.isActive = true;
        match.hardness = hardness;
        if (notes) match.notes = notes;
        reactivated += 1;
        if (isP5) p5Count += 1;
        continue;
      }

      const row: Portfolio = {
        id: crypto.randomUUID(),
        committeeId,
        countryName,
        isP5,
        hardness,
        notes,
        isActive: true,
      };
      store.portfolios.push(row);
      existing.push(row);
      added += 1;
      if (isP5) p5Count += 1;
    }

    revalidateCommittee(committeeId);
    const message = summarizePortfolioAdds({ added, reactivated, skipped, p5Count });
    return { ok: added > 0 || reactivated > 0, message };
  }

  try {
    const client = await createClient();
    const { data: committee, error: committeeError } = await client
      .from("committees")
      .select("id")
      .eq("id", committeeId)
      .maybeSingle();
    if (committeeError) throw committeeError;
    if (!committee) {
      return { ok: false, message: "Committee not found." };
    }

    const { data: existingRows, error: existingError } = await client
      .from("portfolios")
      .select("*")
      .eq("committee_id", committeeId);
    if (existingError) throw existingError;

    const existing = (existingRows ?? []).map((row) =>
      mapPortfolioRow(row as Record<string, unknown>),
    );

    let added = 0;
    let reactivated = 0;
    let skipped = 0;
    let p5Count = 0;

    for (const countryName of names) {
      const match = findExistingPortfolio(existing, countryName);
      const isP5 = isP5Country(match?.countryName ?? countryName);
      if (match) {
        if (match.isActive) {
          skipped += 1;
          continue;
        }
        const { error } = await client
          .from("portfolios")
          .update({
            is_active: true,
            hardness,
            notes: notes ?? match.notes,
            is_p5: isP5,
          })
          .eq("id", match.id);
        if (error) throw error;
        match.isActive = true;
        reactivated += 1;
        if (isP5) p5Count += 1;
        continue;
      }

      const { data: inserted, error } = await client
        .from("portfolios")
        .insert({
          committee_id: committeeId,
          country_name: countryName,
          is_p5: isP5,
          hardness,
          notes,
          is_active: true,
        })
        .select("*")
        .maybeSingle();
      if (error) {
        if (error.code === "23505") {
          skipped += 1;
          continue;
        }
        throw error;
      }
      if (inserted) {
        existing.push(mapPortfolioRow(inserted as Record<string, unknown>));
      }
      added += 1;
      if (isP5) p5Count += 1;
    }

    revalidateCommittee(committeeId);
    const message = summarizePortfolioAdds({ added, reactivated, skipped, p5Count });
    return { ok: added > 0 || reactivated > 0, message };
  } catch (error) {
    console.warn("[meritmun/admin] addPortfolios", error);
    return { ok: false, message: "Could not add countries to the allotment list." };
  }
}

export async function updatePortfolio(
  id: string,
  patch: { hardness?: number; notes?: string | null; isActive?: boolean },
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "edit country lists");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const portfolio = store.portfolios.find((p) => p.id === id);
    if (!portfolio) {
      return { ok: false, message: "Country not found." };
    }
    if (patch.hardness !== undefined) {
      portfolio.hardness = clampPortfolioHardness(patch.hardness);
    }
    if (patch.notes !== undefined) {
      const trimmed = patch.notes?.trim() ?? "";
      portfolio.notes = trimmed ? trimmed : null;
    }
    if (patch.isActive !== undefined) {
      portfolio.isActive = patch.isActive;
    }
    revalidateCommittee(portfolio.committeeId);
    return { ok: true, message: "Allotment updated (demo)." };
  }

  try {
    const client = await createClient();
    const { data: existing, error: fetchError } = await client
      .from("portfolios")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) {
      return { ok: false, message: "Country not found." };
    }

    const payload: Record<string, unknown> = {};
    if (patch.hardness !== undefined) {
      payload.hardness = clampPortfolioHardness(patch.hardness);
    }
    if (patch.notes !== undefined) {
      const trimmed = patch.notes?.trim() ?? "";
      payload.notes = trimmed ? trimmed : null;
    }
    if (patch.isActive !== undefined) {
      payload.is_active = patch.isActive;
    }

    const { error } = await client.from("portfolios").update(payload).eq("id", id);
    if (error) throw error;
    revalidateCommittee(String(existing.committee_id));
    return { ok: true, message: "Allotment updated." };
  } catch (error) {
    console.warn("[meritmun/admin] updatePortfolio", error);
    return { ok: false, message: "Could not update that country." };
  }
}

export async function removePortfolio(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "edit country lists");
  if (!auth.ok) return auth;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const portfolio = store.portfolios.find((p) => p.id === id);
    if (!portfolio) {
      return { ok: false, message: "Country not found." };
    }
    const allotted = store.allotments.some((a) => a.portfolioId === id);
    if (allotted) {
      portfolio.isActive = false;
      revalidateCommittee(portfolio.committeeId);
      return {
        ok: true,
        message: `${portfolio.countryName} is already allotted, so it was deactivated instead of removed.`,
      };
    }
    store.portfolios = store.portfolios.filter((p) => p.id !== id);
    revalidateCommittee(portfolio.committeeId);
    return {
      ok: true,
      message: `${portfolio.countryName} removed from the allotment list (demo).`,
    };
  }

  try {
    const client = await createClient();
    const { data: existing, error: fetchError } = await client
      .from("portfolios")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) {
      return { ok: false, message: "Country not found." };
    }

    const countryName = String(existing.country_name);
    const committeeId = String(existing.committee_id);

    const { count, error: countError } = await client
      .from("allotments")
      .select("id", { count: "exact", head: true })
      .eq("portfolio_id", id);
    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      const { error } = await client
        .from("portfolios")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      revalidateCommittee(committeeId);
      return {
        ok: true,
        message: `${countryName} is already allotted, so it was deactivated instead of removed.`,
      };
    }

    const { error } = await client.from("portfolios").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        const { error: deactivateError } = await client
          .from("portfolios")
          .update({ is_active: false })
          .eq("id", id);
        if (deactivateError) throw deactivateError;
        revalidateCommittee(committeeId);
        return {
          ok: true,
          message: `${countryName} could not be deleted, so it was deactivated.`,
        };
      }
      throw error;
    }

    revalidateCommittee(committeeId);
    return { ok: true, message: `${countryName} removed from the allotment list.` };
  } catch (error) {
    console.warn("[meritmun/admin] removePortfolio", error);
    return { ok: false, message: "Could not remove that country." };
  }
}

export type AnnouncementSaveInput = {
  isActive: boolean;
  message: string;
  linkType: AnnouncementLinkType;
  internalPath: string | null;
  externalUrl: string | null;
};

export async function saveAnnouncement(
  input: AnnouncementSaveInput,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "edit the announcement");
  if (!auth.ok) return auth;

  const message = input.message.trim();
  if (message.length > ANNOUNCEMENT_MESSAGE_MAX) {
    return {
      ok: false,
      message: `Keep the announcement under ${ANNOUNCEMENT_MESSAGE_MAX} characters.`,
    };
  }
  if (input.isActive && !message) {
    return { ok: false, message: "Add a message before showing the bar." };
  }

  const linkType = input.linkType;
  let internalPath: string | null = null;
  let externalUrl: string | null = null;

  if (linkType === "internal") {
    const path = input.internalPath?.trim() ?? "";
    if (!isSafeInternalPath(path)) {
      return { ok: false, message: "Choose a page on this site." };
    }
    internalPath = path;
  } else if (linkType === "external") {
    const url = input.externalUrl?.trim() ?? "";
    if (!isSafeHttpUrl(url)) {
      return {
        ok: false,
        message: "Enter a full http or https link.",
      };
    }
    externalUrl = url;
  }

  const next = {
    isActive: input.isActive,
    message,
    linkType,
    internalPath,
    externalUrl,
  };

  function revalidateAnnouncement(): void {
    revalidatePath("/", "layout");
    revalidatePath("/admin");
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.announcement = {
      ...store.announcement,
      ...next,
      updatedAt: nowIso(),
      updatedBy: "demo-admin",
    };
    revalidateAnnouncement();
    return { ok: true, message: "Announcement saved (demo)." };
  }

  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    const { error } = await client.from("announcement_settings").upsert({
      id: 1,
      is_active: next.isActive,
      message: next.message,
      link_type: next.linkType,
      internal_path: next.internalPath,
      external_url: next.externalUrl,
      updated_at: nowIso(),
      updated_by: user?.id ?? null,
    });
    if (error) throw error;
    revalidateAnnouncement();
    return { ok: true, message: "Announcement saved." };
  } catch (error) {
    console.warn("[meritmun/admin] saveAnnouncement", error);
    const reason =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "unknown error";
    return {
      ok: false,
      message: `Could not save the announcement: ${reason}. If the table is missing, run supabase/migrations/002_announcement_settings.sql.`,
    };
  }
}

export type BroadcastAudience = "all" | "paid" | "unpaid" | "heads";

/**
 * Email every registrant in an audience. Individuals and delegation members
 * are addressed directly; "heads" reaches whoever registered each delegation.
 * Addresses are de-duplicated so nobody gets the same message twice.
 */
export async function sendBroadcastEmail(input: {
  audience: BroadcastAudience;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(STAFF, "send broadcast emails");
  if (!auth.ok) return auth;

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) {
    return { ok: false, message: "Add a subject and a message." };
  }
  if (subject.length > 120) {
    return { ok: false, message: "Keep the subject under 120 characters." };
  }

  try {
    const [delegates, delegations] = await Promise.all([
      listDelegates(),
      listDelegations(),
    ]);
    const recipients = new Map<string, string>();
    const add = (email: string, name: string) => {
      const key = email.trim().toLowerCase();
      if (key && !recipients.has(key)) recipients.set(key, name);
    };

    if (input.audience === "heads") {
      for (const d of delegations) add(d.headEmail, d.headName);
    } else {
      const wanted =
        input.audience === "paid"
          ? "confirmed"
          : input.audience === "unpaid"
            ? "pending"
            : null;
      for (const d of delegates) {
        if (d.paymentStatus === "rejected" && wanted !== null) continue;
        if (wanted && d.paymentStatus !== wanted) continue;
        add(d.email, d.fullName);
      }
      if (input.audience !== "paid") {
        // Heads of unpaid delegations act on payment reminders.
        for (const d of delegations) {
          if (wanted && d.paymentStatus !== wanted) continue;
          add(d.headEmail, d.headName);
        }
      }
    }

    if (recipients.size === 0) {
      return { ok: false, message: "Nobody is in that audience yet." };
    }

    let sent = 0;
    let failed = 0;
    let mocked = 0;
    for (const [email, name] of recipients) {
      const result = await sendBroadcast({
        to: email,
        name,
        subject,
        body,
      });
      if (!result.ok) failed += 1;
      else if (result.mocked) mocked += 1;
      else sent += 1;
    }

    const parts = [`${sent} sent`];
    if (mocked) parts.push(`${mocked} not sent (RESEND_API_KEY is not set)`);
    if (failed) parts.push(`${failed} failed`);
    return {
      ok: failed === 0,
      message: `Broadcast to ${recipients.size} recipient${recipients.size === 1 ? "" : "s"}: ${parts.join(", ")}.`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] sendBroadcastEmail", error);
    return { ok: false, message: "Could not send the broadcast." };
  }
}

/**
 * Change a team member's role. Admin only. Nobody changes their own role (no
 * accidental self-lockout), the owner stays an admin, and the last admin can
 * never be demoted.
 */
export async function updateTeamMemberRole(
  profileId: string,
  role: AdminRole,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeAction(ADMIN_ONLY, "change team roles");
  if (!auth.ok) return auth;
  if (role !== "admin" && role !== "eb" && role !== "reviewer") {
    return { ok: false, message: "Choose a valid role." };
  }
  if (profileId === auth.session.user.id) {
    return { ok: false, message: "You cannot change your own role." };
  }

  const guard = (members: { id: string; email: string; role: string }[]) => {
    const member = members.find((m) => m.id === profileId);
    if (!member) return "Team member not found.";
    if (isTeamOwner(member.email) && role !== "admin") {
      return "The team owner must stay an admin.";
    }
    const admins = members.filter((m) => m.role === "admin");
    if (member.role === "admin" && role !== "admin" && admins.length <= 1) {
      return "At least one admin must remain.";
    }
    return null;
  };

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const blocked = guard(store.teamProfiles);
    if (blocked) return { ok: false, message: blocked };
    const member = store.teamProfiles.find((p) => p.id === profileId)!;
    member.role = role;
    member.updatedAt = nowIso();
    revalidatePath("/admin/team");
    return { ok: true, message: `${member.fullName} is now ${role === "eb" ? "EB" : role}. (demo)` };
  }

  try {
    const client = await createClient();
    const { data: members, error: listError } = await client
      .from("profiles")
      .select("id, email, role, full_name");
    if (listError) throw listError;
    const rows = (members ?? []).map((m) => ({
      id: String(m.id),
      email: String(m.email),
      role: String(m.role),
      fullName: String(m.full_name),
    }));
    const blocked = guard(rows);
    if (blocked) return { ok: false, message: blocked };

    const { data, error } = await client
      .from("profiles")
      .update({ role, updated_at: nowIso() })
      .eq("id", profileId)
      .select("id");
    if (error) throw error;
    if (!data?.length) {
      return { ok: false, message: "You do not have permission to change roles." };
    }
    revalidatePath("/admin/team");
    const name = rows.find((m) => m.id === profileId)?.fullName ?? "The member";
    return {
      ok: true,
      message: `${name} is now ${role === "eb" ? "EB" : role}. The change applies on their next page load.`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] updateTeamMemberRole", error);
    return { ok: false, message: "Could not change the role." };
  }
}
