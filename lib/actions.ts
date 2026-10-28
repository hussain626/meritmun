"use server";

import {
  hasErrors,
  needsCoDelegate,
  type DoubleCommittee,
  validateContact,
  validateDelegate,
  validateDelegation,
} from "@/lib/validation";
import { getDemoStore } from "@/lib/admin/demo-store";
import type {
  BankAccount,
  DelegateRecord,
  DelegationRecord,
  QueryRecord,
} from "@/lib/admin/types";
import { canAcceptRegistration } from "@/lib/admin/auth";
import { listBankAccounts } from "@/lib/admin/data";
import {
  delegationQuote,
  getPublicPricing,
  individualFee,
  memberFee,
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
} from "@/lib/utils";
import type {
  ActionResult,
  CoDelegateChoice,
  PaymentDetails,
  ContactMessage,
  ContactTopic,
  DelegateApplication,
  DelegationApplication,
  DelegationMember,
  ExperienceLevel,
  HearAbout,
  InstitutionType,
  Submission,
} from "@/lib/types";

/** Slugs of committees currently published in the admin panel. */
async function publishedCommitteeSlugs(): Promise<string[]> {
  const list = await listPublicCommittees();
  return list.map((committee) => committee.slug);
}

/** Published committees that seat two delegates per country. */
async function doubleCommittees(): Promise<DoubleCommittee[]> {
  const list = await listPublicCommittees();
  return list
    .filter((committee) => committee.doubleDelegate)
    .map(({ slug, abbr }) => ({ slug, abbr }));
}

/**
 * Delegation members who rank a double-delegate committee first are seated in
 * pairs, in roster order. Returns member index -> shared pair id.
 */
function pairMembers(
  members: DelegationApplication["members"],
  doubles: readonly DoubleCommittee[],
): Map<number, string> {
  const pairs = new Map<number, string>();
  for (const committee of doubles) {
    const indexes = members
      .map((m, i) => (m.committeePrefs[0] === committee.slug ? i : -1))
      .filter((i) => i >= 0);
    for (let k = 0; k + 1 < indexes.length; k += 2) {
      const pairId = crypto.randomUUID();
      pairs.set(indexes[k], pairId);
      pairs.set(indexes[k + 1], pairId);
    }
  }
  return pairs;
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

/**
 * Columns added by later migrations. If a deployment has not run one yet, the
 * insert is retried without it so registration keeps working.
 */
const OPTIONAL_COLUMNS: Record<string, string> = {
  quoted_amount: "008_quoted_amounts.sql",
  referred_by: "013_referrals.sql",
};

function missingOptionalColumn(error: DbError): string | null {
  if (!error) return null;
  const message = error.message ?? "";
  const named = Object.keys(OPTIONAL_COLUMNS).find((c) => message.includes(c));
  if (named) return named;
  // Older PostgREST errors may not name the column; quoted_amount came first.
  return error.code === "PGRST204" || error.code === "42703" ? "quoted_amount" : null;
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
  let current = rows;
  const stripped = new Set<string>();
  for (;;) {
    const { error } = await client.from(table).insert(current);
    const column = missingOptionalColumn(error);
    if (!column || stripped.has(column)) return error;
    stripped.add(column);
    console.warn(
      `[meritmun] ${table}.${column} missing, run supabase/migrations/${OPTIONAL_COLUMNS[column]}`,
    );
    current = current.map((row) => {
      const copy = { ...row };
      delete copy[column];
      return copy;
    });
  }
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
  "We could not save your registration just now. Nothing was charged, please try again in a minute, or contact us if it keeps happening.";

/* ── delegate ────────────────────────────────────────────────────────────── */

/** Pair columns are missing until migration 011 is applied. */
function isMissingPairColumn(error: DbError): boolean {
  return (
    (error?.code === "PGRST204" || error?.code === "42703") &&
    /pair_id|paid_by/i.test(error?.message ?? "")
  );
}

/** The payment details shown on the success screen and in the first email. */
function paymentDetails(
  banks: BankAccount[],
  contacts: string[],
): PaymentDetails {
  return {
    accounts: banks
      .filter((b) => b.isActive)
      .map((b) => ({
        bankName: b.bankName,
        accountTitle: b.accountTitle,
        accountNumber: b.accountNumber,
        iban: b.iban,
        branch: b.branch,
        instructions: b.instructions,
      })),
    contacts,
  };
}

/**
 * Register one delegate. When their first choice seats two delegates per
 * country and they bring their own co-delegate, both are registered as a pair
 * (shared `pair_id`); the co-delegate's fee is paid through this
 * registration (`paid_by`), so the quote covers two.
 */
async function persistDelegate(app: DelegateApplication): Promise<Submission> {
  const pricing = await getPublicPricing();
  const banks = await listBankAccounts();
  const receivedAt = new Date().toISOString();
  const partner = app.coDelegate?.mode === "partner" ? app.coDelegate : null;
  // A co-delegate brought along takes the registrant's social choice.
  const fee = individualFee(pricing, app.withSocial) * (partner ? 2 : 1);
  const pairId = partner ? crypto.randomUUID() : null;
  let reference = generateReference();
  let delegateCode = generateDelegateCode();
  let partnerReference = generateReference();
  let partnerCode = generateDelegateCode();
  const registrantId = crypto.randomUUID();
  const partnerId = crypto.randomUUID();

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const base = {
      institution: app.institution,
      age: null,
      city: app.city,
      committeePrefs: app.committeePrefs,
      accommodation: app.accommodation,
      withSocial: app.withSocial,
      hearAbout: app.hearAbout,
      paymentStatus: "pending" as const,
      paymentAmount: null,
      paymentConfirmedAt: null,
      paymentRejectedAt: null,
      rejectionReason: null,
      delegationId: null,
      isHeadDelegate: false,
      feeType: pricing.delegateFeeType,
      pairId,
      createdAt: receivedAt,
      updatedAt: receivedAt,
    };
    if (partner) {
      const record: DelegateRecord = {
        ...base,
        id: partnerId,
        reference: partnerReference,
        delegateCode: partnerCode,
        fullName: partner.fullName,
        email: partner.email,
        phone: partner.phone,
        experience: partner.experience,
        priorAwards: null,
        quotedAmount: null,
        paidBy: registrantId,
      };
      store.delegates.unshift(record);
    }
    const record: DelegateRecord = {
      ...base,
      id: registrantId,
      reference,
      delegateCode,
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      experience: app.experience,
      priorAwards: app.priorAwards,
      quotedAmount: fee,
      referredBy: app.referredBy,
      paidBy: null,
    };
    store.delegates.unshift(record);
  } else {
    const client = await registrationClient();
    for (let attempt = 1; ; attempt += 1) {
      const rows: Record<string, unknown>[] = [
        {
          id: registrantId,
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
          hear_about: app.hearAbout,
          ...(app.withSocial ? {} : { with_social: false }),
          payment_status: "pending",
          fee_type: pricing.delegateFeeType,
          quoted_amount: fee,
          ...(app.referredBy ? { referred_by: app.referredBy } : {}),
          ...(pairId ? { pair_id: pairId } : {}),
        },
      ];
      if (partner) {
        rows.push({
          id: partnerId,
          reference: partnerReference,
          delegate_code: partnerCode,
          full_name: partner.fullName,
          email: partner.email,
          phone: partner.phone,
          institution: app.institution,
          city: app.city,
          experience: partner.experience,
          committee_prefs: app.committeePrefs,
          accommodation: app.accommodation,
          hear_about: app.hearAbout,
          ...(app.withSocial ? {} : { with_social: false }),
          payment_status: "pending",
          fee_type: pricing.delegateFeeType,
          pair_id: pairId,
          paid_by: registrantId,
        });
      }
      const error = await insertQuoted(client, "delegates", rows);
      if (!error) break;
      if (isUniqueViolation(error) && attempt < MAX_CODE_ATTEMPTS) {
        reference = generateReference();
        delegateCode = generateDelegateCode();
        partnerReference = generateReference();
        partnerCode = generateDelegateCode();
        continue;
      }
      if (isMissingPairColumn(error)) {
        console.warn(
          "[meritmun] co-delegate columns missing, run supabase/migrations/011_double_delegation.sql",
        );
      }
      console.warn("[meritmun] delegate insert failed", error);
      throw new Error("delegate-insert-failed");
    }
  }

  const payment = paymentDetails(banks, pricing.paymentContacts);
  const sent = await sendRegistrationConfirmation({
    to: app.email,
    fullName: app.fullName,
    reference,
    delegateCode,
    bankAccounts: banks.filter((b) => b.isActive),
    paymentContacts: pricing.paymentContacts,
    feeAmount: fee,
    currency: pricing.currency,
  });

  return {
    reference,
    kind: "delegate",
    receivedAt,
    name: app.fullName,
    delegateCode,
    fee: { currency: pricing.currency, amount: fee },
    emailSent: emailWentOut(sent),
    coDelegate: partner
      ? { name: partner.fullName, delegateCode: partnerCode }
      : null,
    payment,
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
  const total = delegationQuote(pricing, app.members);
  let reference = generateReference();

  const pairs = pairMembers(app.members, await doubleCommittees());
  const mintMembers = () =>
    app.members.map((member, index) => ({
      ...member,
      id: crypto.randomUUID(),
      reference: generateReference(),
      delegateCode: generateDelegateCode(),
      isHead: member.email.trim().toLowerCase() === headEmail,
      pairId: pairs.get(index) ?? null,
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
      referredBy: app.referredBy,
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
        hearAbout: "school",
        paymentStatus: "pending",
        paymentAmount: null,
        quotedAmount: memberFee(pricing, member.withSocial),
        withSocial: member.withSocial,
        paymentConfirmedAt: null,
        paymentRejectedAt: null,
        rejectionReason: null,
        delegationId,
        isHeadDelegate: member.isHead,
        pairId: member.pairId,
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
          ...(app.referredBy ? { referred_by: app.referredBy } : {}),
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
          ...(member.pairId ? { pair_id: member.pairId } : {}),
          fee_type: feeType,
          quoted_amount: memberFee(pricing, member.withSocial),
          ...(member.withSocial ? {} : { with_social: false }),
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
    paymentContacts: pricing.paymentContacts,
  });

  return {
    reference,
    kind: "delegation",
    receivedAt,
    name: app.institutionName,
    fee: { currency: pricing.currency, amount: total },
    emailSent: emailWentOut(sent),
    payment: paymentDetails(banks, pricing.paymentContacts),
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
    // Radio "socialTier": "with" or "without"; default with social.
    withSocial: getField(formData, "socialTier") !== "without",
    hearAbout: getField(formData, "hearAbout") as HearAbout,
    referredBy: getField(formData, "referredBy") || null,
    coDelegate: readCoDelegate(formData),
    consent: getCheckbox(formData, "consent"),
  };
}

function readCoDelegate(formData: FormData): CoDelegateChoice | null {
  const mode = getField(formData, "coDelegateMode");
  if (mode === "random") return { mode: "random" };
  if (mode !== "partner") return null;
  return {
    mode: "partner",
    fullName: getField(formData, "coFullName"),
    email: getField(formData, "coEmail"),
    phone: getField(formData, "coPhone"),
    experience: getField(formData, "coExperience") as ExperienceLevel,
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

  const parsed = readDelegateForm(formData);
  const doubles = await doubleCommittees();
  // The co-delegate choice only applies when the first choice seats two.
  const values: DelegateApplication = needsCoDelegate(parsed.committeePrefs, doubles)
    ? parsed
    : { ...parsed, coDelegate: null };
  const errors = validateDelegate(values, await publishedCommitteeSlugs(), doubles);

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
      withSocial: m.withSocial !== false,
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
    referredBy: getField(formData, "referredBy") || null,
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
  const errors = validateDelegation(
    values,
    await publishedCommitteeSlugs(),
    { min: pricing.minDelegation, max: pricing.maxDelegation },
    await doubleCommittees(),
  );

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
    // supabase-js returns errors rather than throwing, so check explicitly,
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
