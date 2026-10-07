"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin/auth";
import { sanitizeAllotmentRules } from "@/lib/admin/allotment-rules";
import { loadAllotmentState, type AllotmentState } from "@/lib/admin/data";
import { getDemoStore } from "@/lib/admin/demo-store";
import type {
  AllotmentRecord,
  AllotmentRules,
  CommitteeAdminRecord,
  DelegateRecord,
  Portfolio,
} from "@/lib/admin/types";
import { sendAllotmentChanged, sendAllotmentConfirmed } from "@/lib/email/send";
import { planAllotments } from "@/lib/merit/allot";
import { scoreDelegates } from "@/lib/merit/score";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; message: string };

function nowIso(): string {
  return new Date().toISOString();
}

function ok(message: string): ActionResult {
  return { ok: true, message };
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function revalidateAllotments(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/allotments");
  revalidatePath("/admin/allotment-rules");
  revalidatePath("/admin/countries");
  revalidatePath("/admin/registrations");
}

/** Mutations need admin or EB. Returns the acting user id, or a failure. */
async function requireMutator(): Promise<
  { ok: true; userId: string | null } | { ok: false; message: string }
> {
  const session = await getAdminSession();
  if (!session) return { ok: false, message: "Your session has expired. Sign in again." };
  if (session.role !== "admin" && session.role !== "eb") {
    return { ok: false, message: "Only admins and the EB can change allotments." };
  }
  return {
    ok: true,
    userId: isSupabaseConfigured() ? session.user.id : null,
  };
}

function demoState(): AllotmentState {
  const store = getDemoStore();
  return {
    delegates: store.delegates,
    committees: store.committees,
    portfolios: store.portfolios,
    allotments: store.allotments,
    rules: store.allotmentRules,
  };
}

/* ── Merit engine ────────────────────────────────────────────────────────── */

export type MeritRunOptions = {
  /** Keep existing merit drafts and only seat delegates without one. */
  keepDrafts?: boolean;
  /** Limit the run to these delegates (e.g. right after a payment confirm). */
  delegateIds?: string[];
};

/**
 * Batch merit run. Scores every eligible paid delegate, then seats them in
 * merit order against the country pool and the allotment rules. Confirmed
 * and manual allotments are never touched; merit drafts are replaced unless
 * `keepDrafts` is set.
 */
export async function runMeritEngineAction(
  options: MeritRunOptions = {},
): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);

  let client: Awaited<ReturnType<typeof createClient>> | null = null;
  let state: AllotmentState;
  try {
    if (isSupabaseConfigured()) {
      client = await createClient();
      state = await loadAllotmentState(client);
    } else {
      state = demoState();
    }
  } catch (error) {
    console.warn("[meritmun/admin] runMeritEngine load", error);
    return fail("Could not load registrations. Run migration 005 if it is missing.");
  }

  const only = options.delegateIds ? new Set(options.delegateIds) : null;
  const isLocked = (a: AllotmentRecord) =>
    a.status === "confirmed" ||
    a.source === "manual" ||
    Boolean(options.keepDrafts);

  const lockedDelegates = new Set(
    state.allotments.filter(isLocked).map((a) => a.delegateId),
  );
  const eligible = state.delegates.filter(
    (d) =>
      d.paymentStatus === "confirmed" &&
      !lockedDelegates.has(d.id) &&
      (!only || only.has(d.id)),
  );

  if (eligible.length === 0) {
    return ok("Nothing to allot — every paid delegate already has a locked seat.");
  }
  if (!state.portfolios.some((p) => p.isActive)) {
    return fail("The country pool is empty. Add countries under Committees first.");
  }

  const eligibleIds = new Set(eligible.map((d) => d.id));
  const replaced = state.allotments.filter(
    (a) => eligibleIds.has(a.delegateId) && !isLocked(a),
  );
  const replacedIds = new Set(replaced.map((a) => a.id));
  const kept = state.allotments.filter((a) => !replacedIds.has(a.id));

  const delegationOf = new Map(state.delegates.map((d) => [d.id, d.delegationId]));
  const delegationCommitteeCounts = new Map<string, number>();
  for (const a of kept) {
    const delegationId = delegationOf.get(a.delegateId);
    if (!delegationId) continue;
    const key = `${delegationId}:${a.committeeId}`;
    delegationCommitteeCounts.set(key, (delegationCommitteeCounts.get(key) ?? 0) + 1);
  }

  const scored = await scoreDelegates(eligible, state.rules.useAiScoring);
  if (!scored.ok) return fail(scored.error);

  const plan = planAllotments({
    delegates: eligible,
    scores: scored.scores,
    committees: state.committees,
    portfolios: state.portfolios,
    takenPortfolioIds: new Set(kept.map((a) => a.portfolioId)),
    delegationCommitteeCounts,
    rules: state.rules,
  });

  const stamp = nowIso();
  const runLog = [
    ...plan.placements.map((p) => ({
      delegateId: p.delegateId,
      status: "success" as const,
      error: null,
      score: p.score,
    })),
    ...plan.unplaced.map((u) => ({
      delegateId: u.delegateId,
      status: "failed" as const,
      error: u.reason,
      score: u.score,
    })),
  ];

  if (!client) {
    const store = getDemoStore();
    store.allotments = store.allotments.filter((a) => !replacedIds.has(a.id));
    for (const p of plan.placements) {
      store.allotments.push({
        id: crypto.randomUUID(),
        delegateId: p.delegateId,
        committeeId: p.committeeId,
        portfolioId: p.portfolioId,
        source: "merit",
        status: "draft",
        rationale: p.rationale,
        score: p.score,
        confirmedAt: null,
        confirmedBy: null,
        emailSentAt: null,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
    store.meritRuns.push(
      ...runLog.map((r) => ({
        delegateId: r.delegateId,
        status: r.status,
        error: r.error,
        createdAt: stamp,
      })),
    );
  } else {
    try {
      if (replacedIds.size > 0) {
        const { error } = await client
          .from("allotments")
          .delete()
          .in("id", [...replacedIds]);
        if (error) throw error;
      }
      if (plan.placements.length > 0) {
        const { error } = await client.from("allotments").insert(
          plan.placements.map((p) => ({
            delegate_id: p.delegateId,
            committee_id: p.committeeId,
            portfolio_id: p.portfolioId,
            source: "merit",
            status: "draft",
            rationale: p.rationale,
            score: p.score,
          })),
        );
        if (error) throw error;
      }
      const { error: logError } = await client.from("merit_runs").insert(
        runLog.map((r) => ({
          delegate_id: r.delegateId,
          status: r.status,
          error: r.error,
          raw_response: { score: r.score, source: scored.source },
        })),
      );
      if (logError) console.warn("[meritmun/admin] merit_runs log", logError);
    } catch (error) {
      console.warn("[meritmun/admin] runMeritEngine save", error);
      return fail(
        "The engine ran but the seats could not be saved. Someone may have changed allotments at the same time — run it again.",
      );
    }
  }

  revalidateAllotments();
  const parts = [
    `Seated ${plan.placements.length} of ${eligible.length} delegate${eligible.length === 1 ? "" : "s"} as drafts`,
    plan.unplaced.length > 0 ? `${plan.unplaced.length} need EB placement` : null,
    scored.source === "ai"
      ? `scored by Gemini (${scored.calls} call${scored.calls === 1 ? "" : "s"})`
      : "scored by the built-in heuristic",
  ].filter(Boolean);
  return ok(`${parts.join(" · ")}.`);
}

/* ── Manual placement ────────────────────────────────────────────────────── */

type SeatContext = {
  delegate: DelegateRecord;
  committee: CommitteeAdminRecord;
  portfolio: Portfolio;
  existing: AllotmentRecord | undefined;
  holder: AllotmentRecord | undefined;
};

function resolveSeat(
  state: AllotmentState,
  input: { delegateId: string; committeeId: string; portfolioId: string },
): SeatContext | string {
  const delegate = state.delegates.find((d) => d.id === input.delegateId);
  if (!delegate) return "Delegate not found.";
  if (delegate.paymentStatus !== "confirmed") {
    return "Confirm this delegate's payment before giving them a seat.";
  }
  const committee = state.committees.find((c) => c.id === input.committeeId);
  if (!committee) return "Choose a committee.";
  const portfolio = state.portfolios.find((p) => p.id === input.portfolioId);
  if (!portfolio || portfolio.committeeId !== committee.id) {
    return "Choose a country from this committee's pool.";
  }
  if (!portfolio.isActive) return `${portfolio.countryName} is inactive in the pool.`;

  const existing = state.allotments.find((a) => a.delegateId === delegate.id);
  const holder = state.allotments.find(
    (a) => a.portfolioId === portfolio.id && a.delegateId !== delegate.id,
  );
  return { delegate, committee, portfolio, existing, holder };
}

/**
 * Create or change a delegate's seat by hand. Manual seats are locked from
 * merit re-runs. P5 is allowed here (EB only). Changing a confirmed
 * allotment needs `confirmChange` and emails the delegate the new seat.
 */
export async function saveManualAllotment(input: {
  delegateId: string;
  committeeId: string;
  portfolioId: string;
  rationale: string;
  confirmChange?: boolean;
}): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);

  let client: Awaited<ReturnType<typeof createClient>> | null = null;
  let state: AllotmentState;
  try {
    if (isSupabaseConfigured()) {
      client = await createClient();
      state = await loadAllotmentState(client);
    } else {
      state = demoState();
    }
  } catch (error) {
    console.warn("[meritmun/admin] saveManualAllotment load", error);
    return fail("Could not load allotments.");
  }

  const seat = resolveSeat(state, input);
  if (typeof seat === "string") return fail(seat);
  const { delegate, committee, portfolio, existing, holder } = seat;

  if (holder) {
    const holderName =
      state.delegates.find((d) => d.id === holder.delegateId)?.fullName ??
      "another delegate";
    return fail(
      `${portfolio.countryName} in ${committee.abbr} is already held by ${holderName}. Free that seat first.`,
    );
  }

  const isConfirmed = existing?.status === "confirmed";
  if (isConfirmed && !input.confirmChange) {
    return fail("This allotment was already issued. Confirm the change to email the delegate.");
  }
  if (
    existing &&
    existing.portfolioId === portfolio.id &&
    (existing.rationale ?? "") === input.rationale.trim()
  ) {
    return ok("Nothing changed.");
  }

  const stamp = nowIso();
  const rationale = input.rationale.trim() || "Placed manually by EB.";

  // Changing an issued seat: email first so the record only moves if the
  // delegate actually hears about it.
  let emailSentAt: string | null = existing?.emailSentAt ?? null;
  if (isConfirmed && existing.portfolioId !== portfolio.id) {
    const sent = await sendAllotmentChanged({
      to: delegate.email,
      fullName: delegate.fullName,
      committeeName: committee.name,
      countryName: portfolio.countryName,
      studyGuideUrl: committee.studyGuideUrl,
    });
    emailSentAt = sent.ok ? stamp : null;
  }

  if (!client) {
    const store = getDemoStore();
    if (existing) {
      const row = store.allotments.find((a) => a.id === existing.id)!;
      row.committeeId = committee.id;
      row.portfolioId = portfolio.id;
      row.source = "manual";
      row.rationale = rationale;
      row.emailSentAt = emailSentAt;
      row.updatedAt = stamp;
    } else {
      store.allotments.push({
        id: crypto.randomUUID(),
        delegateId: delegate.id,
        committeeId: committee.id,
        portfolioId: portfolio.id,
        source: "manual",
        status: "draft",
        rationale,
        score: null,
        confirmedAt: null,
        confirmedBy: null,
        emailSentAt: null,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  } else {
    try {
      if (existing) {
        const { error } = await client
          .from("allotments")
          .update({
            committee_id: committee.id,
            portfolio_id: portfolio.id,
            source: "manual",
            rationale,
            email_sent_at: emailSentAt,
            updated_at: stamp,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await client.from("allotments").insert({
          delegate_id: delegate.id,
          committee_id: committee.id,
          portfolio_id: portfolio.id,
          source: "manual",
          status: "draft",
          rationale,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.warn("[meritmun/admin] saveManualAllotment", error);
      const code = (error as { code?: string })?.code;
      return fail(
        code === "23505"
          ? `${portfolio.countryName} was just taken by someone else. Pick another country.`
          : "Could not save the allotment.",
      );
    }
  }

  revalidateAllotments();
  const p5Note = portfolio.isP5 ? " (P5 — manual EB seat)" : "";
  if (isConfirmed) {
    return ok(
      emailSentAt
        ? `Allotment changed to ${portfolio.countryName}${p5Note}; the delegate has been emailed.`
        : `Allotment changed to ${portfolio.countryName}${p5Note}, but the email failed — use Issue allotments to retry.`,
    );
  }
  return ok(`${delegate.fullName} → ${committee.abbr} · ${portfolio.countryName}${p5Note} (draft).`);
}

/** Remove a draft allotment, freeing its seat. Issued seats cannot be cleared. */
export async function clearAllotment(id: string): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const row = store.allotments.find((a) => a.id === id);
    if (!row) return fail("Allotment not found.");
    if (row.status === "confirmed") return fail("Issued allotments cannot be cleared — change the seat instead.");
    store.allotments = store.allotments.filter((a) => a.id !== id);
    revalidateAllotments();
    return ok("Draft cleared (demo).");
  }

  try {
    const client = await createClient();
    const { error, count } = await client
      .from("allotments")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("status", "draft");
    if (error) throw error;
    if (!count) return fail("Only draft allotments can be cleared.");
    revalidateAllotments();
    return ok("Draft cleared. The seat is free again.");
  } catch (error) {
    console.warn("[meritmun/admin] clearAllotment", error);
    return fail("Could not clear the draft.");
  }
}

/* ── Issue (confirm + email) ─────────────────────────────────────────────── */

type IssueOutcome = { sent: number; failed: number; skipped: number };

async function issueRows(
  state: AllotmentState,
  rows: AllotmentRecord[],
  userId: string | null,
  client: Awaited<ReturnType<typeof createClient>> | null,
): Promise<IssueOutcome> {
  const outcome: IssueOutcome = { sent: 0, failed: 0, skipped: 0 };
  const delegates = new Map(state.delegates.map((d) => [d.id, d]));
  const committees = new Map(state.committees.map((c) => [c.id, c]));
  const portfolios = new Map(state.portfolios.map((p) => [p.id, p]));

  for (const row of rows) {
    const delegate = delegates.get(row.delegateId);
    const committee = committees.get(row.committeeId);
    const portfolio = portfolios.get(row.portfolioId);
    if (!delegate || !committee || !portfolio || delegate.paymentStatus !== "confirmed") {
      outcome.skipped += 1;
      continue;
    }

    const sent = await sendAllotmentConfirmed({
      to: delegate.email,
      fullName: delegate.fullName,
      committeeName: committee.name,
      countryName: portfolio.countryName,
      studyGuideUrl: committee.studyGuideUrl,
    });
    if (!sent.ok) {
      console.warn("[meritmun/admin] allotment email", delegate.email, sent.error);
      outcome.failed += 1;
      continue;
    }

    const stamp = nowIso();
    const patch =
      row.status === "confirmed"
        ? { emailSentAt: stamp }
        : { status: "confirmed" as const, confirmedAt: stamp, confirmedBy: userId, emailSentAt: stamp };

    if (!client) {
      const target = getDemoStore().allotments.find((a) => a.id === row.id);
      if (target) Object.assign(target, patch, { updatedAt: stamp });
    } else {
      const { error } = await client
        .from("allotments")
        .update({
          ...(row.status === "confirmed"
            ? {}
            : { status: "confirmed", confirmed_at: stamp, confirmed_by: userId }),
          email_sent_at: stamp,
          updated_at: stamp,
        })
        .eq("id", row.id);
      if (error) {
        console.warn("[meritmun/admin] issue update", error);
        outcome.failed += 1;
        continue;
      }
    }
    outcome.sent += 1;
  }
  return outcome;
}

function describeIssue(outcome: IssueOutcome): string {
  const parts = [`Issued ${outcome.sent} allotment${outcome.sent === 1 ? "" : "s"}`];
  if (outcome.failed) parts.push(`${outcome.failed} email${outcome.failed === 1 ? "" : "s"} failed (still pending — retry)`);
  if (outcome.skipped) parts.push(`${outcome.skipped} skipped (payment not confirmed)`);
  return `${parts.join(" · ")}.`;
}

/** Confirm one allotment and email the delegate. */
export async function issueAllotment(id: string): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);
  try {
    const client = isSupabaseConfigured() ? await createClient() : null;
    const state = client ? await loadAllotmentState(client) : demoState();
    const row = state.allotments.find((a) => a.id === id);
    if (!row) return fail("Allotment not found.");
    if (row.status === "confirmed" && row.emailSentAt) {
      return ok("Already issued.");
    }
    const outcome = await issueRows(state, [row], auth.userId, client);
    revalidateAllotments();
    return outcome.sent === 1 ? ok("Allotment issued and emailed.") : fail(describeIssue(outcome));
  } catch (error) {
    console.warn("[meritmun/admin] issueAllotment", error);
    return fail("Could not issue the allotment.");
  }
}

/**
 * Issue every draft for paid delegates (optionally one committee), and retry
 * any confirmed allotment whose email never went out.
 */
export async function issueAllotments(
  committeeId?: string,
): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);
  try {
    const client = isSupabaseConfigured() ? await createClient() : null;
    const state = client ? await loadAllotmentState(client) : demoState();
    const rows = state.allotments.filter(
      (a) =>
        (!committeeId || a.committeeId === committeeId) &&
        (a.status === "draft" || !a.emailSentAt),
    );
    if (rows.length === 0) return ok("Nothing to issue — every allotment has been sent.");
    const outcome = await issueRows(state, rows, auth.userId, client);
    revalidateAllotments();
    return { ok: outcome.failed === 0, message: describeIssue(outcome) };
  } catch (error) {
    console.warn("[meritmun/admin] issueAllotments", error);
    return fail("Could not issue allotments.");
  }
}

/* ── Rules + committee pause ─────────────────────────────────────────────── */

export async function saveAllotmentRules(
  input: Partial<AllotmentRules>,
): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);
  const rules = sanitizeAllotmentRules(input);

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.allotmentRules = { ...rules, updatedAt: nowIso() };
    revalidateAllotments();
    return ok("Rules saved (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client.from("allotment_rules").upsert({
      id: 1,
      advanced_min_score: rules.advancedMinScore,
      intermediate_min_score: rules.intermediateMinScore,
      preference_depth: rules.preferenceDepth,
      fallback_mode: rules.fallbackMode,
      delegation_committee_cap: rules.delegationCommitteeCap,
      match_hardness: rules.matchHardness,
      use_ai_scoring: rules.useAiScoring,
      updated_by: auth.userId,
      updated_at: nowIso(),
    });
    if (error) throw error;
    revalidateAllotments();
    return ok("Rules saved. They apply from the next merit run.");
  } catch (error) {
    console.warn("[meritmun/admin] saveAllotmentRules", error);
    return fail("Could not save rules. Run migration 005 if the table is missing.");
  }
}

export async function setCommitteeAllotmentsPaused(
  committeeId: string,
  paused: boolean,
): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);

  if (!isSupabaseConfigured()) {
    const committee = getDemoStore().committees.find((c) => c.id === committeeId);
    if (!committee) return fail("Committee not found.");
    committee.allotmentsPaused = paused;
    revalidateAllotments();
    revalidatePath("/admin/committees");
    return ok(paused ? "Committee paused (demo)." : "Committee resumed (demo).");
  }

  try {
    const client = await createClient();
    const { error } = await client
      .from("committees")
      .update({ allotments_paused: paused, updated_at: nowIso() })
      .eq("id", committeeId);
    if (error) throw error;
    revalidateAllotments();
    revalidatePath("/admin/committees");
    return ok(
      paused
        ? "Paused — the merit engine will skip this committee."
        : "Resumed — the merit engine will fill this committee again.",
    );
  } catch (error) {
    console.warn("[meritmun/admin] setCommitteeAllotmentsPaused", error);
    return fail("Could not update the committee. Run migration 005 if the column is missing.");
  }
}

/* ── Attendance ──────────────────────────────────────────────────────────── */

export async function setAttendance(
  delegateId: string,
  dayId: string,
  present: boolean,
): Promise<ActionResult> {
  const auth = await requireMutator();
  if (!auth.ok) return fail(auth.message);

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.attendance = store.attendance.filter(
      (a) => !(a.delegateId === delegateId && a.dayId === dayId),
    );
    if (present) store.attendance.push({ delegateId, dayId, markedAt: nowIso() });
    revalidatePath("/admin/countries");
    return ok(present ? "Marked present." : "Marked absent.");
  }

  try {
    const client = await createClient();
    const { error } = present
      ? await client.from("delegate_attendance").upsert({
          delegate_id: delegateId,
          day_id: dayId,
          marked_by: auth.userId,
          marked_at: nowIso(),
        })
      : await client
          .from("delegate_attendance")
          .delete()
          .eq("delegate_id", delegateId)
          .eq("day_id", dayId);
    if (error) throw error;
    revalidatePath("/admin/countries");
    return ok(present ? "Marked present." : "Marked absent.");
  } catch (error) {
    console.warn("[meritmun/admin] setAttendance", error);
    return fail("Could not save attendance. Run migration 005 if the table is missing.");
  }
}
