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
  BankAccount,
  FeeType,
  Portfolio,
  PricingSettings,
} from "@/lib/admin/types";
import { getPricing } from "@/lib/admin/data";
import { getAdminSession } from "@/lib/admin/auth";
import { isTeamOwner, TEAM_OWNER_EMAIL } from "@/lib/admin/team";
import { sendPaymentConfirmed } from "@/lib/email/send";
import { runMeritEngineAction } from "@/lib/admin/allotment-actions";
import { isP5Country } from "@/lib/merit/p5";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

function feeForType(feeType: FeeType, pricing: PricingSettings): number {
  switch (feeType) {
    case "early_bird_delegate":
      return pricing.earlyBirdDelegateFee ?? pricing.delegateFee;
    case "delegation_member":
      return pricing.perDelegateFee;
    case "early_bird_delegation_member":
      return pricing.earlyBirdPerDelegateFee ?? pricing.perDelegateFee;
    default:
      return pricing.delegateFee;
  }
}

/** Auto-run merit for newly paid delegates; payment stays confirmed even if this fails. */
async function queueMerit(delegateIds: string[]): Promise<string> {
  const result = await runMeritEngineAction({ delegateIds, keepDrafts: true });
  return result.ok ? result.message : `Merit run did not complete: ${result.message}`;
}

export async function confirmDelegatePayment(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegate = store.delegates.find((d) => d.id === id);
    if (!delegate) {
      return { ok: false, message: "Delegate not found." };
    }
    delegate.paymentStatus = "confirmed";
    delegate.paymentAmount =
      delegate.paymentAmount ?? feeForType(delegate.feeType, store.pricing);
    delegate.paymentConfirmedAt = nowIso();
    delegate.paymentRejectedAt = null;
    delegate.rejectionReason = null;
    delegate.updatedAt = nowIso();

    await sendPaymentConfirmed({
      to: delegate.email,
      fullName: delegate.fullName,
      reference: delegate.reference,
    });
    const merit = await queueMerit([id]);

    revalidateAdmin();
    return { ok: true, message: `Payment confirmed (demo). ${merit}` };
  }

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

    const { error } = await client
      .from("delegates")
      .update({
        payment_status: "confirmed",
        payment_amount: feeForType(delegate.fee_type as FeeType, pricing),
        payment_confirmed_at: nowIso(),
        payment_rejected_at: null,
        rejection_reason: null,
        updated_at: nowIso(),
      })
      .eq("id", id);
    if (error) throw error;

    await sendPaymentConfirmed({
      to: String(delegate.email),
      fullName: String(delegate.full_name),
      reference: String(delegate.reference),
    });
    const merit = await queueMerit([id]);

    revalidateAdmin();
    return { ok: true, message: `Payment confirmed. ${merit}` };
  } catch (error) {
    console.warn("[meritmun/admin] confirmDelegatePayment", error);
    return { ok: false, message: "Could not confirm payment." };
  }
}

/**
 * One payment covers a whole delegation: confirm the delegation and every
 * member on its roster, email the head, then run merit for the members.
 */
export async function confirmDelegationPayment(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegation = store.delegations.find((d) => d.id === id);
    if (!delegation) return { ok: false, message: "Delegation not found." };
    const members = store.delegates.filter((d) => d.delegationId === id);
    const stamp = nowIso();
    let total = 0;
    for (const member of members) {
      member.paymentStatus = "confirmed";
      member.paymentAmount =
        member.paymentAmount ?? feeForType(member.feeType, store.pricing);
      member.paymentConfirmedAt = stamp;
      member.paymentRejectedAt = null;
      member.rejectionReason = null;
      member.updatedAt = stamp;
      total += member.paymentAmount;
    }
    delegation.paymentStatus = "confirmed";
    delegation.paymentAmount =
      delegation.paymentAmount ??
      (total || delegation.delegationSize * store.pricing.perDelegateFee);
    delegation.updatedAt = stamp;

    await sendPaymentConfirmed({
      to: delegation.headEmail,
      fullName: delegation.headName,
      reference: delegation.reference,
    });
    const merit = members.length
      ? await queueMerit(members.map((m) => m.id))
      : "No roster members to allot.";

    revalidateAdmin();
    return {
      ok: true,
      message: `Delegation confirmed with ${members.length} member${members.length === 1 ? "" : "s"} (demo). ${merit}`,
    };
  }

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

    const { data: members, error: membersError } = await client
      .from("delegates")
      .select("id, fee_type")
      .eq("delegation_id", id);
    if (membersError) throw membersError;

    const stamp = nowIso();
    let total = 0;
    for (const member of members ?? []) {
      const amount = feeForType(member.fee_type as FeeType, pricing);
      total += amount;
      const { error } = await client
        .from("delegates")
        .update({
          payment_status: "confirmed",
          payment_amount: amount,
          payment_confirmed_at: stamp,
          payment_rejected_at: null,
          rejection_reason: null,
          updated_at: stamp,
        })
        .eq("id", String(member.id));
      if (error) throw error;
    }

    const { error } = await client
      .from("delegations")
      .update({
        payment_status: "confirmed",
        payment_amount:
          total || Number(delegation.delegation_size) * pricing.perDelegateFee,
        updated_at: stamp,
      })
      .eq("id", id);
    if (error) throw error;

    await sendPaymentConfirmed({
      to: String(delegation.head_email),
      fullName: String(delegation.head_name),
      reference: String(delegation.reference),
    });
    const memberIds = (members ?? []).map((m) => String(m.id));
    const merit = memberIds.length
      ? await queueMerit(memberIds)
      : "No roster members to allot.";

    revalidateAdmin();
    return {
      ok: true,
      message: `Delegation confirmed with ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}. ${merit}`,
    };
  } catch (error) {
    console.warn("[meritmun/admin] confirmDelegationPayment", error);
    return { ok: false, message: "Could not confirm the delegation payment." };
  }
}

export async function rejectDelegationPayment(
  id: string,
  reason?: string,
): Promise<{ ok: boolean; message: string }> {
  const rejection = reason?.trim() || "Rejected by admin.";
  const stamp = nowIso();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegation = store.delegations.find((d) => d.id === id);
    if (!delegation) return { ok: false, message: "Delegation not found." };
    delegation.paymentStatus = "rejected";
    delegation.updatedAt = stamp;
    for (const member of store.delegates.filter((d) => d.delegationId === id)) {
      member.paymentStatus = "rejected";
      member.paymentRejectedAt = stamp;
      member.rejectionReason = rejection;
      member.paymentConfirmedAt = null;
      member.updatedAt = stamp;
    }
    revalidateAdmin();
    return { ok: true, message: "Delegation payment rejected (demo)." };
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("delegations")
      .update({ payment_status: "rejected", updated_at: stamp })
      .eq("id", id);
    if (error) throw error;
    const { error: membersError } = await client
      .from("delegates")
      .update({
        payment_status: "rejected",
        payment_rejected_at: stamp,
        rejection_reason: rejection,
        payment_confirmed_at: null,
        updated_at: stamp,
      })
      .eq("delegation_id", id);
    if (membersError) throw membersError;
    revalidateAdmin();
    return { ok: true, message: "Delegation payment rejected." };
  } catch (error) {
    console.warn("[meritmun/admin] rejectDelegationPayment", error);
    return { ok: false, message: "Could not reject the delegation payment." };
  }
}

export async function rejectDelegatePayment(
  id: string,
  reason?: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegate = store.delegates.find((d) => d.id === id);
    if (!delegate) {
      return { ok: false, message: "Delegate not found." };
    }
    delegate.paymentStatus = "rejected";
    delegate.paymentRejectedAt = nowIso();
    delegate.rejectionReason = reason?.trim() || "Rejected by admin.";
    delegate.paymentConfirmedAt = null;
    delegate.updatedAt = nowIso();
    revalidateAdmin();
    return { ok: true, message: "Payment rejected (demo)." };
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("delegates")
      .update({
        payment_status: "rejected",
        payment_rejected_at: nowIso(),
        rejection_reason: reason?.trim() || "Rejected by admin.",
        payment_confirmed_at: null,
        updated_at: nowIso(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidateAdmin();
    return { ok: true, message: "Payment rejected." };
  } catch (error) {
    console.warn("[meritmun/admin] rejectDelegatePayment", error);
    return { ok: false, message: "Could not reject payment." };
  }
}

export async function resendRegistrationEmail(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegate = store.delegates.find((d) => d.id === id);
    if (!delegate) {
      return { ok: false, message: "Delegate not found." };
    }
    console.info(
      `[meritmun/admin] demo resend registration email → ${delegate.email} (${delegate.delegateCode})`,
    );
    return { ok: true, message: "Confirmation email queued (demo)." };
  }

  console.info(`[meritmun/admin] resend registration email for ${id}`);
  revalidatePath("/admin/registrations");
  return { ok: true, message: "Confirmation email queued." };
}

export async function replyToQuery(
  id: string,
  body: string,
): Promise<{ ok: boolean; message: string }> {
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
    query.replyBody = trimmed;
    query.status = "answered";
    query.repliedAt = nowIso();
    query.repliedBy = "demo-admin";
    revalidateAdmin();
    return { ok: true, message: "Reply sent (demo)." };
  }

  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    const { error } = await client
      .from("queries")
      .update({
        reply_body: trimmed,
        status: "answered",
        replied_at: nowIso(),
        replied_by: user?.id ?? null,
      })
      .eq("id", id);
    if (error) throw error;
    revalidateAdmin();
    return { ok: true, message: "Reply sent." };
  } catch (error) {
    console.warn("[meritmun/admin] replyToQuery", error);
    return { ok: false, message: "Could not send reply." };
  }
}

export type PricingSaveInput = Omit<
  PricingSettings,
  "id" | "updatedAt" | "updatedBy"
>;

export async function savePricing(
  data: PricingSaveInput,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.pricing = {
      ...store.pricing,
      ...data,
      currency: "PKR",
      updatedAt: nowIso(),
      updatedBy: "demo-admin",
    };
    revalidateAdmin();
    return { ok: true, message: "Pricing saved (demo)." };
  }

  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    const { error } = await client
      .from("pricing_settings")
      .upsert({
        id: 1,
        currency: "PKR",
        delegate_fee: data.delegateFee,
        delegation_fee: data.delegationFee,
        per_delegate_fee: data.perDelegateFee,
        delegation_min: data.delegationMin,
        delegation_max: data.delegationMax,
        early_bird_enabled: data.earlyBirdEnabled,
        early_bird_delegate_fee: data.earlyBirdDelegateFee,
        early_bird_per_delegate_fee: data.earlyBirdPerDelegateFee,
        early_bird_ends_at: data.earlyBirdEndsAt,
        updated_at: nowIso(),
        updated_by: user?.id ?? null,
      });
    if (error) throw error;
    revalidateAdmin();
    return { ok: true, message: "Pricing saved." };
  } catch (error) {
    console.warn("[meritmun/admin] savePricing", error);
    return { ok: false, message: "Could not save pricing." };
  }
}

export async function upsertBankAccount(
  input: Omit<BankAccount, "createdAt"> & { createdAt?: string },
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const existing = store.bankAccounts.findIndex((b) => b.id === input.id);
    const row: BankAccount = {
      id: input.id,
      bankName: input.bankName,
      accountTitle: input.accountTitle,
      accountNumber: input.accountNumber,
      iban: input.iban,
      branch: input.branch,
      instructions: input.instructions,
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

  console.info("[meritmun/admin] upsertBankAccount", input.id);
  revalidatePath("/admin/pricing");
  return { ok: true, message: "Bank account saved." };
}

export async function deleteBankAccount(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.bankAccounts = store.bankAccounts.filter((b) => b.id !== id);
    revalidateAdmin();
    return { ok: true, message: "Bank account removed (demo)." };
  }

  console.info("[meritmun/admin] deleteBankAccount", id);
  revalidatePath("/admin/pricing");
  return { ok: true, message: "Bank account removed." };
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
      return {
        ok: false,
        message: `Login was created, but saving the admin profile failed: ${profileError.message}.${
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
  if (!session || !isTeamOwner(session.user.email)) {
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
  }>,
): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const committee = store.committees.find((c) => c.id === id);
    if (!committee) {
      return { ok: false, message: "Committee not found." };
    }
    Object.assign(committee, patch, { updatedAt: nowIso() });
    revalidatePath("/admin/committees");
    revalidatePath(`/admin/committees/${id}`);
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
        updated_at: nowIso(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/committees");
    revalidatePath(`/admin/committees/${id}`);
    revalidatePath("/committees");
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
    message += ` ${p5Count} P5 — merit will not auto-assign ${p5Count === 1 ? "that seat" : "those seats"}.`;
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
    return { ok: false, message: "Could not save the announcement." };
  }
}
