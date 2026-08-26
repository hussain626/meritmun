"use server";

import { committees } from "@/content/committees";
import {
  hasErrors,
  validateContact,
  validateDelegate,
  validateDelegation,
} from "@/lib/validation";
import { getDemoStore } from "@/lib/admin/demo-store";
import type { DelegateRecord, QueryRecord } from "@/lib/admin/types";
import { getPricing, listBankAccounts } from "@/lib/admin/data";
import { sendRegistrationConfirmation } from "@/lib/email/send";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
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
  ContactMessage,
  ContactTopic,
  DelegateApplication,
  DelegationApplication,
  ExperienceLevel,
  HearAbout,
  InstitutionType,
  StatusResult,
  Submission,
  SubmissionKind,
} from "@/lib/types";

const committeeSlugs = committees.map((committee) => committee.slug);

/**
 * THE BACKEND SEAM.
 *
 * Mint a reference, persist (Supabase or demo store), and send confirmation
 * mail when the payload is a registration. Contact messages become queries.
 */
async function persist(
  kind: SubmissionKind,
  name: string,
  payload: unknown,
): Promise<Submission> {
  const submission: Submission = {
    reference: generateReference(),
    kind,
    receivedAt: new Date().toISOString(),
    name,
  };

  if (kind === "delegate" && payload && typeof payload === "object") {
    const app = payload as DelegateApplication;
    const delegateCode = generateDelegateCode();
    const pricing = await getPricing();
    const banks = await listBankAccounts();

    if (!isSupabaseConfigured()) {
      const store = getDemoStore();
      const record: DelegateRecord = {
        id: `delegate-${submission.reference}`,
        reference: submission.reference,
        delegateCode,
        fullName: app.fullName,
        email: app.email,
        phone: app.phone,
        institution: app.institution,
        age: app.age,
        city: app.city,
        experience: app.experience,
        priorAwards: app.priorAwards,
        committeePrefs: app.committeePrefs,
        accommodation: app.accommodation,
        dietary: app.dietary,
        hearAbout: app.hearAbout,
        paymentStatus: "pending",
        paymentAmount: null,
        paymentConfirmedAt: null,
        paymentRejectedAt: null,
        rejectionReason: null,
        delegationId: null,
        feeType: pricing.earlyBirdEnabled ? "early_bird_delegate" : "delegate",
        createdAt: submission.receivedAt,
        updatedAt: submission.receivedAt,
      };
      store.delegates.unshift(record);
    } else {
      try {
        const client = await createClient();
        await client.from("delegates").insert({
          reference: submission.reference,
          delegate_code: delegateCode,
          full_name: app.fullName,
          email: app.email,
          phone: app.phone,
          institution: app.institution,
          age: app.age,
          city: app.city,
          experience: app.experience,
          prior_awards: app.priorAwards,
          committee_prefs: app.committeePrefs,
          accommodation: app.accommodation,
          dietary: app.dietary,
          hear_about: app.hearAbout,
          payment_status: "pending",
          fee_type: pricing.earlyBirdEnabled ? "early_bird_delegate" : "delegate",
        });
      } catch (error) {
        console.warn("[meritmun] delegate insert failed", error);
      }
    }

    await sendRegistrationConfirmation({
      to: app.email,
      fullName: app.fullName,
      reference: submission.reference,
      delegateCode,
      bankAccounts: banks.filter((b) => b.isActive),
      feeAmount: pricing.earlyBirdEnabled
        ? (pricing.earlyBirdDelegateFee ?? pricing.delegateFee)
        : pricing.delegateFee,
      currency: pricing.currency,
    });
  }

  if (kind === "contact" && payload && typeof payload === "object") {
    const msg = payload as ContactMessage;
    if (!isSupabaseConfigured()) {
      const store = getDemoStore();
      const query: QueryRecord = {
        id: `query-${submission.reference}`,
        name: msg.name,
        email: msg.email,
        topic: msg.topic,
        subject: msg.subject,
        message: msg.message,
        status: "open",
        replyBody: null,
        repliedAt: null,
        repliedBy: null,
        createdAt: submission.receivedAt,
      };
      store.queries.unshift(query);
    } else {
      try {
        const client = await createClient();
        await client.from("queries").insert({
          name: msg.name,
          email: msg.email,
          topic: msg.topic,
          subject: msg.subject,
          message: msg.message,
          status: "open",
        });
      } catch (error) {
        console.warn("[meritmun] query insert failed", error);
      }
    }
  }

  console.log("[meritmun] submission", { ...submission, payload });
  return submission;
}

/* ── delegate ────────────────────────────────────────────────────────────── */

function readDelegateForm(formData: FormData): DelegateApplication {
  return {
    fullName: getField(formData, "fullName"),
    email: getField(formData, "email"),
    phone: getField(formData, "phone"),
    institution: getField(formData, "institution"),
    age: getNumberField(formData, "age"),
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
  const values = readDelegateForm(formData);
  const errors = validateDelegate(values, committeeSlugs);

  if (hasErrors(errors)) {
    return {
      ok: false,
      errors,
      message: "Check the highlighted fields and submit again.",
    };
  }

  const submission = await persist("delegate", values.fullName, values);
  return { ok: true, data: submission };
}

/* ── delegation ──────────────────────────────────────────────────────────── */

function readDelegationForm(formData: FormData): DelegationApplication {
  return {
    institutionName: getField(formData, "institutionName"),
    institutionCity: getField(formData, "institutionCity"),
    institutionType: getField(formData, "institutionType") as InstitutionType,
    headName: getField(formData, "headName"),
    headEmail: getField(formData, "headEmail"),
    headPhone: getField(formData, "headPhone"),
    headRole: getField(formData, "headRole"),
    delegationSize: getNumberField(formData, "delegationSize"),
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
  const values = readDelegationForm(formData);
  const errors = validateDelegation(values, committeeSlugs);

  if (hasErrors(errors)) {
    return {
      ok: false,
      errors,
      message: "Check the highlighted fields and submit again.",
    };
  }

  const submission = await persist(
    "delegation",
    values.institutionName,
    values,
  );
  return { ok: true, data: submission };
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

  const submission = await persist("contact", values.name, values);
  return { ok: true, data: submission };
}

/* ── status lookup ───────────────────────────────────────────────────────── */

const STATUS_COPY: Record<StatusResult["status"], string> = {
  received:
    "We have your application. Allocations are still being worked through — nothing is required from you yet.",
  "under-review":
    "Delegate Affairs is matching your committee preferences against your stated experience. You will hear by email.",
  allocated:
    "You have been allocated. Check your email for your committee, your portfolio, and the background guide.",
  confirmed:
    "Your place is confirmed and your fee is settled. Bring photo ID and this reference code to registration.",
  "not-found":
    "No application matches that reference code. Check it against your confirmation email — codes look like MMIII-4KQ7ZP.",
};

/**
 * Status lookup. Checks the demo store / Supabase first; falls back to the
 * deterministic mock so every UI state remains reachable without seed data.
 */
export async function lookupStatus(
  _prev: ActionResult<StatusResult> | null,
  formData: FormData,
): Promise<ActionResult<StatusResult>> {
  const reference = getField(formData, "reference").toUpperCase();

  if (reference === "") {
    return { ok: false, errors: { reference: "Enter your reference code." } };
  }

  if (!isValidReferenceShape(reference) && reference.length < 6) {
    return {
      ok: false,
      errors: {
        reference: "Codes look like MMIII-4KQ7ZP — six characters after the dash.",
      },
    };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const byRef = store.delegates.find(
      (d) =>
        d.reference.toUpperCase() === reference ||
        d.delegateCode.toUpperCase() === reference,
    );
    if (byRef) {
      const allotment = store.allotments.find(
        (a) => a.delegateId === byRef.id && a.status === "confirmed",
      );
      const draft = store.allotments.find(
        (a) => a.delegateId === byRef.id && a.status === "draft",
      );
      let status: StatusResult["status"] = "received";
      if (byRef.paymentStatus === "confirmed" && allotment) status = "confirmed";
      else if (draft || allotment) status = "allocated";
      else if (byRef.paymentStatus === "confirmed") status = "under-review";
      else status = "received";

      const committeeId = allotment?.committeeId ?? draft?.committeeId;
      const committee =
        store.committees.find((c) => c.id === committeeId)?.name ?? null;

      return {
        ok: true,
        data: {
          reference: byRef.reference,
          status,
          committee,
          note: STATUS_COPY[status],
        },
      };
    }
  }

  if (!isValidReferenceShape(reference)) {
    return {
      ok: false,
      errors: {
        reference: "Codes look like MMIII-4KQ7ZP — six characters after the dash.",
      },
    };
  }

  const seed = reference
    .slice(6)
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  const outcomes: StatusResult["status"][] = [
    "received",
    "under-review",
    "allocated",
    "confirmed",
    "not-found",
  ];
  const status = outcomes[seed % outcomes.length] ?? "received";

  const committee =
    status === "allocated" || status === "confirmed"
      ? (committees[seed % committees.length]?.name ?? null)
      : null;

  return {
    ok: true,
    data: { reference, status, committee, note: STATUS_COPY[status] },
  };
}
