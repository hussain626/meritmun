"use server";

import {
  hasErrors,
  validateContact,
  validateDelegate,
  validateDelegation,
} from "@/lib/validation";
import { getDemoStore } from "@/lib/admin/demo-store";
import type {
  DelegateRecord,
  DelegationRecord,
  QueryRecord,
} from "@/lib/admin/types";
import { canAcceptRegistration } from "@/lib/admin/auth";
import { listBankAccounts } from "@/lib/admin/data";
import {
  delegationQuote,
  getPublicPricing,
  listPublicCommittees,
} from "@/lib/public/data";
import {
  sendDelegationRegistrationConfirmation,
  sendRegistrationConfirmation,
  type SendResult,
} from "@/lib/email/send";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  generateDelegateCode,
  generateReference,
  getAllFields,
  getCheckbox,
  getField,
  getNumberField,
  isValidReferenceShape,
} from "@/lib/utils";
import type {
  ActionResult,
  ApplicationStatus,
  ContactMessage,
  ContactTopic,
  DelegateApplication,
  DelegationApplication,
  DelegationMember,
  ExperienceLevel,
  HearAbout,
  InstitutionType,
  StatusMember,
  StatusResult,
  Submission,
} from "@/lib/types";

/** Slugs of committees currently published in the admin panel. */
async function publishedCommitteeSlugs(): Promise<string[]> {
  const list = await listPublicCommittees();
  return list.map((committee) => committee.slug);
}

/**
 * Public registrations write with the service role when it is configured
 * (anon cannot read rows back); otherwise the anon client, which migration
 * 005 allows to insert unpaid rows.
 */
async function registrationClient() {
  return createServiceClient() ?? (await createClient());
}

type DbError = { code?: string; message?: string } | null;

/** Migration 008 not applied yet: the quoted_amount column is missing. */
function isMissingQuoteColumn(error: DbError): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /quoted_amount/i.test(error.message ?? "")
  );
}

function isUniqueViolation(error: DbError): boolean {
  return error?.code === "23505";
}

/**
 * Insert rows that carry `quoted_amount`, retrying without it when the column
 * does not exist yet so registration keeps working before migration 008.
 */
async function insertQuoted(
  client: Awaited<ReturnType<typeof registrationClient>>,
  table: "delegates" | "delegations",
  rows: Record<string, unknown>[],
): Promise<DbError> {
  const { error } = await client.from(table).insert(rows);
  if (!isMissingQuoteColumn(error)) return error;
  console.warn(
    `[meritmun] ${table}.quoted_amount missing — run supabase/migrations/008_quoted_amounts.sql`,
  );
  const stripped = rows.map((row) => {
    const copy = { ...row };
    delete copy.quoted_amount;
    return copy;
  });
  const retry = await client.from(table).insert(stripped);
  return retry.error;
}

/** Reference / delegate-code collisions are rare; retry with fresh codes. */
const MAX_CODE_ATTEMPTS = 3;

const REGISTRATION_CLOSED =
  "Registration is closed right now, so this application was not saved. Watch the homepage for the reopening date.";

/** Demo mode never sends mail; on the live site a mocked send means no key. */
function emailWentOut(result: SendResult): boolean {
  return result.ok && (!result.mocked || !isSupabaseConfigured());
}

const SAVE_FAILED =
  "We could not save your registration just now. Nothing was charged — please try again in a minute, or contact us if it keeps happening.";

/* ── delegate ────────────────────────────────────────────────────────────── */

async function persistDelegate(app: DelegateApplication): Promise<Submission> {
  const pricing = await getPublicPricing();
  const banks = await listBankAccounts();
  const receivedAt = new Date().toISOString();
  let reference = generateReference();
  let delegateCode = generateDelegateCode();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const record: DelegateRecord = {
      id: `delegate-${reference}`,
      reference,
      delegateCode,
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      institution: app.institution,
      age: null,
      city: app.city,
      experience: app.experience,
      priorAwards: app.priorAwards,
      committeePrefs: app.committeePrefs,
      accommodation: app.accommodation,
      dietary: app.dietary,
      hearAbout: app.hearAbout,
      paymentStatus: "pending",
      paymentAmount: null,
      quotedAmount: pricing.delegate,
      paymentConfirmedAt: null,
      paymentRejectedAt: null,
      rejectionReason: null,
      delegationId: null,
      isHeadDelegate: false,
      feeType: pricing.delegateFeeType,
      createdAt: receivedAt,
      updatedAt: receivedAt,
    };
    store.delegates.unshift(record);
  } else {
    const client = await registrationClient();
    for (let attempt = 1; ; attempt += 1) {
      const error = await insertQuoted(client, "delegates", [
        {
          reference,
          delegate_code: delegateCode,
          full_name: app.fullName,
          email: app.email,
          phone: app.phone,
          institution: app.institution,
          city: app.city,
          experience: app.experience,
          prior_awards: app.priorAwards,
          committee_prefs: app.committeePrefs,
          accommodation: app.accommodation,
          dietary: app.dietary,
          hear_about: app.hearAbout,
          payment_status: "pending",
          fee_type: pricing.delegateFeeType,
          quoted_amount: pricing.delegate,
        },
      ]);
      if (!error) break;
      if (isUniqueViolation(error) && attempt < MAX_CODE_ATTEMPTS) {
        reference = generateReference();
        delegateCode = generateDelegateCode();
        continue;
      }
      console.warn("[meritmun] delegate insert failed", error);
      throw new Error("delegate-insert-failed");
    }
  }

  const sent = await sendRegistrationConfirmation({
    to: app.email,
    fullName: app.fullName,
    reference,
    delegateCode,
    bankAccounts: banks.filter((b) => b.isActive),
    feeAmount: pricing.delegate,
    currency: pricing.currency,
  });

  return {
    reference,
    kind: "delegate",
    receivedAt,
    name: app.fullName,
    delegateCode,
    fee: { currency: pricing.currency, amount: pricing.delegate },
    emailSent: emailWentOut(sent),
  };
}

/* ── delegation ──────────────────────────────────────────────────────────── */

/**
 * A delegation is one `delegations` row plus one `delegates` row per roster
 * member, so every student is paid for, allotted, and emailed individually.
 */
async function persistDelegation(
  app: DelegationApplication,
): Promise<Submission> {
  const pricing = await getPublicPricing();
  const banks = await listBankAccounts();
  const receivedAt = new Date().toISOString();
  const feeType = pricing.memberFeeType;
  const headEmail = app.headEmail.trim().toLowerCase();
  const total = delegationQuote(pricing, app.members.length);
  let reference = generateReference();

  const mintMembers = () =>
    app.members.map((member) => ({
      ...member,
      id: crypto.randomUUID(),
      reference: generateReference(),
      delegateCode: generateDelegateCode(),
      isHead: member.email.trim().toLowerCase() === headEmail,
    }));
  let members = mintMembers();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const delegationId = crypto.randomUUID();
    const delegation: DelegationRecord = {
      id: delegationId,
      reference,
      institutionName: app.institutionName,
      institutionCity: app.institutionCity,
      institutionType: app.institutionType,
      headName: app.headName,
      headEmail: app.headEmail,
      headPhone: app.headPhone,
      headRole: app.headRole,
      delegationSize: members.length,
      facultyAccompanying: app.facultyAccompanying,
      committeeSpread: app.committeeSpread,
      accommodationCount: app.accommodationCount,
      notes: app.notes,
      paymentStatus: "pending",
      paymentAmount: null,
      quotedAmount: total,
      createdAt: receivedAt,
      updatedAt: receivedAt,
    };
    store.delegations.unshift(delegation);
    // Newest-first store: insert in reverse so the roster reads in form order.
    for (const member of [...members].reverse()) {
      const record: DelegateRecord = {
        id: member.id,
        reference: member.reference,
        delegateCode: member.delegateCode,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        institution: app.institutionName,
        age: null,
        city: app.institutionCity,
        experience: member.experience,
        priorAwards: member.priorAwards,
        committeePrefs: member.committeePrefs,
        accommodation: false,
        dietary: null,
        hearAbout: "school",
        paymentStatus: "pending",
        paymentAmount: null,
        quotedAmount: pricing.perDelegate,
        paymentConfirmedAt: null,
        paymentRejectedAt: null,
        rejectionReason: null,
        delegationId,
        isHeadDelegate: member.isHead,
        feeType,
        createdAt: receivedAt,
        updatedAt: receivedAt,
      };
      store.delegates.unshift(record);
    }
  } else {
    const client = await registrationClient();
    for (let attempt = 1; ; attempt += 1) {
      const delegationId = crypto.randomUUID();
      const delegationError = await insertQuoted(client, "delegations", [
        {
          id: delegationId,
          reference,
          institution_name: app.institutionName,
          institution_city: app.institutionCity,
          institution_type: app.institutionType,
          head_name: app.headName,
          head_email: app.headEmail,
          head_phone: app.headPhone,
          head_role: app.headRole,
          delegation_size: members.length,
          faculty_accompanying: app.facultyAccompanying,
          committee_spread: app.committeeSpread,
          accommodation_count: app.accommodationCount,
          notes: app.notes,
          payment_status: "pending",
          quoted_amount: total,
        },
      ]);
      if (delegationError) {
        if (isUniqueViolation(delegationError) && attempt < MAX_CODE_ATTEMPTS) {
          reference = generateReference();
          continue;
        }
        console.warn("[meritmun] delegation insert failed", delegationError);
        throw new Error("delegation-insert-failed");
      }

      const membersError = await insertQuoted(
        client,
        "delegates",
        members.map((member) => ({
          id: member.id,
          reference: member.reference,
          delegate_code: member.delegateCode,
          full_name: member.fullName,
          email: member.email,
          phone: member.phone,
          institution: app.institutionName,
          city: app.institutionCity,
          experience: member.experience,
          prior_awards: member.priorAwards,
          committee_prefs: member.committeePrefs,
          hear_about: "school",
          payment_status: "pending",
          delegation_id: delegationId,
          is_head_delegate: member.isHead,
          fee_type: feeType,
          quoted_amount: pricing.perDelegate,
        })),
      );
      if (!membersError) break;

      // Roll back so the head can resubmit cleanly. Only the service role may
      // delete; without it the orphan row is logged for an admin to remove.
      const { error: rollbackError } = await client
        .from("delegations")
        .delete()
        .eq("id", delegationId);
      if (rollbackError) {
        console.warn(
          `[meritmun] could not roll back empty delegation ${reference} (${delegationId}); remove it in the admin panel`,
          rollbackError,
        );
      }
      if (isUniqueViolation(membersError) && attempt < MAX_CODE_ATTEMPTS) {
        reference = generateReference();
        members = mintMembers();
        continue;
      }
      console.warn("[meritmun] delegation roster insert failed", membersError);
      throw new Error("delegation-insert-failed");
    }
  }

  const sent = await sendDelegationRegistrationConfirmation({
    to: app.headEmail,
    headName: app.headName,
    institutionName: app.institutionName,
    reference,
    members: members.map((m) => ({
      fullName: m.fullName,
      delegateCode: m.delegateCode,
    })),
    feeAmount: total,
    currency: pricing.currency,
    bankAccounts: banks.filter((b) => b.isActive),
  });

  return {
    reference,
    kind: "delegation",
    receivedAt,
    name: app.institutionName,
    fee: { currency: pricing.currency, amount: total },
    emailSent: emailWentOut(sent),
  };
}

function readDelegateForm(formData: FormData): DelegateApplication {
  return {
    fullName: getField(formData, "fullName"),
    email: getField(formData, "email"),
    phone: getField(formData, "phone"),
    institution: getField(formData, "institution"),
    city: getField(formData, "city"),
    experience: getField(formData, "experience") as ExperienceLevel,
    priorAwards: getField(formData, "priorAwards") || null,
    committeePrefs: [
      getField(formData, "committeePref1"),
      getField(formData, "committeePref2"),
      getField(formData, "committeePref3"),
    ],
    accommodation: getCheckbox(formData, "accommodation"),
    dietary: getField(formData, "dietary") || null,
    hearAbout: getField(formData, "hearAbout") as HearAbout,
    consent: getCheckbox(formData, "consent"),
  };
}

export async function submitDelegate(
  _prev: ActionResult<Submission> | null,
  formData: FormData,
): Promise<ActionResult<Submission>> {
  // The form is hidden while registration is closed, but an open tab or a
  // replayed POST still reaches this action.
  if (!(await canAcceptRegistration(getField(formData, "manual") === "1"))) {
    return { ok: false, errors: {}, message: REGISTRATION_CLOSED };
  }

  const values = readDelegateForm(formData);
  const errors = validateDelegate(values, await publishedCommitteeSlugs());

  if (hasErrors(errors)) {
    return {
      ok: false,
      errors,
      message: "Check the highlighted fields and submit again.",
    };
  }

  try {
    const submission = await persistDelegate(values);
    console.log("[meritmun] submission", submission);
    return { ok: true, data: submission };
  } catch (error) {
    console.warn("[meritmun] submitDelegate", error);
    return { ok: false, errors: {}, message: SAVE_FAILED };
  }
}

/** Roster arrives as one JSON field; coerce every value so bad input just fails validation. */
function readMembers(formData: FormData): DelegationMember[] {
  let raw: unknown;
  try {
    raw = JSON.parse(getField(formData, "members") || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 100).map((item) => {
    const m = (typeof item === "object" && item !== null ? item : {}) as Record<
      string,
      unknown
    >;
    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const prefs = Array.isArray(m.committeePrefs) ? m.committeePrefs : [];
    return {
      fullName: text(m.fullName),
      email: text(m.email),
      phone: text(m.phone),
      experience: text(m.experience) as ExperienceLevel,
      priorAwards: text(m.priorAwards) || null,
      committeePrefs: [0, 1, 2].map((i) => text(prefs[i])),
    };
  });
}

function readDelegationForm(formData: FormData): DelegationApplication {
  const members = readMembers(formData);
  return {
    institutionName: getField(formData, "institutionName"),
    institutionCity: getField(formData, "institutionCity"),
    institutionType: getField(formData, "institutionType") as InstitutionType,
    headName: getField(formData, "headName"),
    headEmail: getField(formData, "headEmail"),
    headPhone: getField(formData, "headPhone"),
    headRole: getField(formData, "headRole"),
    delegationSize: members.length,
    members,
    facultyAccompanying: getCheckbox(formData, "facultyAccompanying"),
    committeeSpread: getAllFields(formData, "committeeSpread"),
    accommodationCount: getNumberField(formData, "accommodationCount"),
    notes: getField(formData, "notes") || null,
    consent: getCheckbox(formData, "consent"),
  };
}

export async function submitDelegation(
  _prev: ActionResult<Submission> | null,
  formData: FormData,
): Promise<ActionResult<Submission>> {
  if (!(await canAcceptRegistration(getField(formData, "manual") === "1"))) {
    return { ok: false, errors: {}, message: REGISTRATION_CLOSED };
  }

  const values = readDelegationForm(formData);
  const pricing = await getPublicPricing();
  const errors = validateDelegation(values, await publishedCommitteeSlugs(), {
    min: pricing.minDelegation,
    max: pricing.maxDelegation,
  });

  if (hasErrors(errors)) {
    return {
      ok: false,
      errors,
      message: "Check the highlighted fields and submit again.",
    };
  }

  try {
    const submission = await persistDelegation(values);
    console.log("[meritmun] submission", submission);
    return { ok: true, data: submission };
  } catch (error) {
    console.warn("[meritmun] submitDelegation", error);
    return { ok: false, errors: {}, message: SAVE_FAILED };
  }
}

/* ── contact ─────────────────────────────────────────────────────────────── */

export async function submitContact(
  _prev: ActionResult<Submission> | null,
  formData: FormData,
): Promise<ActionResult<Submission>> {
  const values: ContactMessage = {
    name: getField(formData, "name"),
    email: getField(formData, "email"),
    topic: getField(formData, "topic") as ContactTopic,
    subject: getField(formData, "subject"),
    message: getField(formData, "message"),
  };

  const errors = validateContact(values);
  if (hasErrors(errors)) {
    return {
      ok: false,
      errors,
      message: "Check the highlighted fields and send again.",
    };
  }

  const receivedAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const query: QueryRecord = {
      id: `query-${crypto.randomUUID()}`,
      name: values.name,
      email: values.email,
      topic: values.topic,
      subject: values.subject,
      message: values.message,
      status: "open",
      replyBody: null,
      repliedAt: null,
      repliedBy: null,
      createdAt: receivedAt,
    };
    store.queries.unshift(query);
  } else {
    // supabase-js returns errors rather than throwing, so check explicitly —
    // otherwise a failed save still shows "Message sent".
    const client = await createClient();
    const { error } = await client.from("queries").insert({
      name: values.name,
      email: values.email,
      topic: values.topic,
      subject: values.subject,
      message: values.message,
      status: "open",
    });
    if (error) {
      console.warn("[meritmun] query insert failed", error);
      return {
        ok: false,
        errors: {},
        message:
          "We could not send your message just now. Try again in a minute, or email the desk directly using the addresses on this page.",
      };
    }
  }

  // Contact messages have no status to look up, so no reference is shown.
  return {
    ok: true,
    data: { reference: "", kind: "contact", receivedAt, name: values.name },
  };
}

/* ── status lookup ───────────────────────────────────────────────────────── */

const STATUS_COPY: Record<ApplicationStatus, string> = {
  received:
    "We have your application. Pay the fee using the bank details in your confirmation email and quote your code as the payment reference — your status moves on once Finance confirms the payment.",
  "under-review":
    "Your payment is confirmed. Delegate Affairs is matching your committee preferences against your stated experience. You will hear by email.",
  allocated:
    "You have been allocated. Check your email for your committee, your portfolio, and the background guide.",
  confirmed:
    "Your place is confirmed and your fee is settled. Bring photo ID and this reference code to registration.",
  "payment-rejected":
    "We could not match your payment. Email Delegate Affairs with your payment screenshot and this reference code so we can sort it out.",
  "not-found":
    "No application matches that reference code. Check it against your confirmation email — codes look like MMIII-4KQ7ZP.",
};

type IssuedSeat = { committee: string; portfolio: string | null };

type StatusSource = {
  reference: string;
  paymentStatus: string;
  /** An ISSUED allotment only — drafts stay private. */
  issued: IssuedSeat | null;
};

function stageFor(source: StatusSource): ApplicationStatus {
  if (source.paymentStatus === "rejected") return "payment-rejected";
  if (source.paymentStatus === "confirmed" && source.issued) return "confirmed";
  if (source.issued) return "allocated";
  if (source.paymentStatus === "confirmed") return "under-review";
  return "received";
}

function toStatusResult(
  source: StatusSource,
  members?: StatusMember[],
): StatusResult {
  const status = stageFor(source);
  return {
    reference: source.reference,
    status,
    committee: source.issued?.committee ?? null,
    portfolio: source.issued?.portfolio ?? null,
    note: STATUS_COPY[status],
    ...(members ? { members } : {}),
  };
}

const NOT_FOUND = (reference: string): ActionResult<StatusResult> => ({
  ok: true,
  data: {
    reference,
    status: "not-found",
    committee: null,
    portfolio: null,
    note: STATUS_COPY["not-found"],
  },
});

/**
 * Status lookup by registration reference (MMIII-XXXXXX), delegate code, or
 * delegation reference. Reads the same records the admin panel edits, so a
 * confirmed payment or an issued allotment shows here straight away.
 */
export async function lookupStatus(
  _prev: ActionResult<StatusResult> | null,
  formData: FormData,
): Promise<ActionResult<StatusResult>> {
  const reference = getField(formData, "reference").trim().toUpperCase();

  if (reference === "") {
    return { ok: false, errors: { reference: "Enter your reference code." } };
  }

  // Only the two code shapes we issue are accepted — this also keeps user
  // input out of the PostgREST filter string below.
  const isDelegateCode = /^[A-HJ-NP-Z2-9]{8}$/.test(reference);
  if (!isValidReferenceShape(reference) && !isDelegateCode) {
    return {
      ok: false,
      errors: {
        reference:
          "Use the reference (MMIII-4KQ7ZP) or the 8-character delegate code from your confirmation email.",
      },
    };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const issuedFor = (delegateId: string): IssuedSeat | null => {
      const issued = store.allotments.find(
        (a) => a.delegateId === delegateId && a.status === "confirmed",
      );
      if (!issued) return null;
      return {
        committee:
          store.committees.find((c) => c.id === issued.committeeId)?.name ??
          "Committee to be confirmed",
        portfolio:
          store.portfolios.find((p) => p.id === issued.portfolioId)
            ?.countryName ?? null,
      };
    };

    const delegate = store.delegates.find(
      (d) =>
        d.reference.toUpperCase() === reference ||
        d.delegateCode.toUpperCase() === reference,
    );
    if (delegate) {
      return {
        ok: true,
        data: toStatusResult({
          reference: delegate.reference,
          paymentStatus: delegate.paymentStatus,
          issued: issuedFor(delegate.id),
        }),
      };
    }
    const delegation = store.delegations.find(
      (d) => d.reference.toUpperCase() === reference,
    );
    if (delegation) {
      const members = store.delegates
        .filter((d) => d.delegationId === delegation.id)
        .map((d) => {
          const issued = issuedFor(d.id);
          return {
            name: d.fullName,
            status: stageFor({
              reference: d.reference,
              paymentStatus: d.paymentStatus,
              issued,
            }),
            committee: issued?.committee ?? null,
            portfolio: issued?.portfolio ?? null,
          };
        });
      return {
        ok: true,
        data: toStatusResult(
          {
            reference: delegation.reference,
            paymentStatus: delegation.paymentStatus,
            issued: null,
          },
          members,
        ),
      };
    }
    return NOT_FOUND(reference);
  }

  // Registrations are not publicly readable under RLS, so the lookup needs
  // the service role. It only ever returns status + committee + portfolio.
  const service = createServiceClient();
  if (!service) {
    console.warn("[meritmun] lookupStatus needs SUPABASE_SERVICE_ROLE_KEY");
    return {
      ok: false,
      errors: {
        reference:
          "Status lookup is temporarily unavailable. Check your email, or contact the secretariat.",
      },
    };
  }

  async function issuedSeats(
    delegateIds: string[],
  ): Promise<Map<string, IssuedSeat>> {
    const seats = new Map<string, IssuedSeat>();
    if (delegateIds.length === 0 || !service) return seats;
    const { data, error } = await service
      .from("allotments")
      .select("delegate_id, committees(name), portfolios(country_name)")
      .in("delegate_id", delegateIds)
      .eq("status", "confirmed");
    if (error) throw error;
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const committee = row.committees as { name?: unknown } | null;
      const portfolio = row.portfolios as { country_name?: unknown } | null;
      seats.set(String(row.delegate_id), {
        committee: committee?.name
          ? String(committee.name)
          : "Committee to be confirmed",
        portfolio: portfolio?.country_name
          ? String(portfolio.country_name)
          : null,
      });
    }
    return seats;
  }

  try {
    const { data: delegate, error } = await service
      .from("delegates")
      .select("id, reference, payment_status")
      .or(`reference.eq.${reference},delegate_code.eq.${reference}`)
      .maybeSingle();
    if (error) throw error;

    if (delegate) {
      const seats = await issuedSeats([String(delegate.id)]);
      return {
        ok: true,
        data: toStatusResult({
          reference: String(delegate.reference),
          paymentStatus: String(delegate.payment_status),
          issued: seats.get(String(delegate.id)) ?? null,
        }),
      };
    }

    const { data: delegation, error: delegationError } = await service
      .from("delegations")
      .select("id, reference, payment_status")
      .eq("reference", reference)
      .maybeSingle();
    if (delegationError) throw delegationError;
    if (delegation) {
      const { data: roster, error: rosterError } = await service
        .from("delegates")
        .select("id, reference, full_name, payment_status")
        .eq("delegation_id", String(delegation.id))
        .order("created_at", { ascending: true });
      if (rosterError) throw rosterError;
      const rows = (roster ?? []) as Record<string, unknown>[];
      const seats = await issuedSeats(rows.map((r) => String(r.id)));
      const members = rows.map((r) => {
        const issued = seats.get(String(r.id)) ?? null;
        return {
          name: String(r.full_name),
          status: stageFor({
            reference: String(r.reference),
            paymentStatus: String(r.payment_status),
            issued,
          }),
          committee: issued?.committee ?? null,
          portfolio: issued?.portfolio ?? null,
        };
      });
      return {
        ok: true,
        data: toStatusResult(
          {
            reference: String(delegation.reference),
            paymentStatus: String(delegation.payment_status),
            issued: null,
          },
          members,
        ),
      };
    }

    return NOT_FOUND(reference);
  } catch (error) {
    console.warn("[meritmun] lookupStatus", error);
    return {
      ok: false,
      errors: { reference: "We could not check that right now. Try again in a minute." },
    };
  }
}
