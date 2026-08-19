"use server";

import { committees } from "@/content/committees";
import {
  hasErrors,
  validateContact,
  validateDelegate,
  validateDelegation,
} from "@/lib/validation";
import {
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
 * Everything upstream of this function is production code. This is the only
 * place that touches the outside world, and today it does not: it logs and
 * mints a reference code. Swap the body for a database insert plus a
 * confirmation email and the rest of the application is unchanged.
 */
async function persist(
  kind: SubmissionKind,
  name: string,
  payload: unknown,
): Promise<Submission> {
  const submission: Submission = {
    reference: generateReference(),
    kind,
    // Stamped here rather than in the client so two users never disagree
    // about when a submission was received.
    receivedAt: new Date().toISOString(),
    name,
  };

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
 * Deterministic mock lookup — see the "Out of scope" section of
 * `context/project-overview.md`. The code's own characters select the status,
 * so a given reference always returns the same answer and every state in the
 * UI is reachable for demonstration.
 */
export async function lookupStatus(
  _prev: ActionResult<StatusResult> | null,
  formData: FormData,
): Promise<ActionResult<StatusResult>> {
  const reference = getField(formData, "reference").toUpperCase();

  if (reference === "") {
    return { ok: false, errors: { reference: "Enter your reference code." } };
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
