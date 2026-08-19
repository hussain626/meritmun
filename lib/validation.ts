/**
 * The single source of validation truth. Imported by the client forms for
 * instant inline feedback AND by the server actions as the authority — one
 * module, no drift. See `context/architecture.md`, constraint 6.
 */
import type {
  ContactMessage,
  DelegateApplication,
  DelegationApplication,
  FieldErrors,
} from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Deliberately permissive: Pakistani numbers are written a dozen ways and
// rejecting a real number is far more costly than accepting a malformed one.
const PHONE = /^[+\d][\d\s()+-]{7,19}$/;

export const MIN_AGE = 13;
export const MAX_AGE = 30;
export const MIN_DELEGATION = 5;
export const MAX_DELEGATION = 30;

/* ── field-level helpers ─────────────────────────────────────────────────── */

export function required(value: string, label: string): string | null {
  return value.trim() === "" ? `${label} is required.` : null;
}

export function minLength(
  value: string,
  length: number,
  label: string,
): string | null {
  if (value.trim() === "") return `${label} is required.`;
  return value.trim().length < length
    ? `${label} needs at least ${length} characters.`
    : null;
}

export function validEmail(value: string): string | null {
  if (value.trim() === "") return "Email address is required.";
  return EMAIL.test(value.trim())
    ? null
    : "That does not look like an email address.";
}

export function validPhone(value: string): string | null {
  if (value.trim() === "") return "Phone number is required.";
  return PHONE.test(value.trim())
    ? null
    : "Include the country or city code, e.g. +92 300 1234567.";
}

export function inRange(
  value: number,
  min: number,
  max: number,
  label: string,
): string | null {
  if (Number.isNaN(value)) return `${label} is required.`;
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (value < min || value > max) {
    return `${label} must be between ${min} and ${max}.`;
  }
  return null;
}

export function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): string | null {
  if (value.trim() === "") return `${label} is required.`;
  return (allowed as readonly string[]).includes(value)
    ? null
    : `Choose a valid ${label.toLowerCase()}.`;
}

function prune(errors: Record<string, string | null>): FieldErrors {
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value) out[key] = value;
  }
  return out;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/* ── allowed values ──────────────────────────────────────────────────────── */

export const EXPERIENCE_LEVELS = [
  "first-time",
  "1-3",
  "4-9",
  "10-plus",
] as const;

export const HEAR_ABOUT = [
  "instagram",
  "school",
  "friend",
  "alumni",
  "other",
] as const;

export const INSTITUTION_TYPES = [
  "school",
  "college",
  "university",
  "mun-society",
  "other",
] as const;

export const CONTACT_TOPICS = [
  "registration",
  "delegation",
  "sponsorship",
  "press",
  "other",
] as const;

/* ── form-level validators ───────────────────────────────────────────────── */

/**
 * Steps are validated independently so the stepper can block forward movement
 * on the current step without surfacing errors for fields the user has not
 * reached yet.
 */
export const DELEGATE_STEP_FIELDS: string[][] = [
  ["fullName", "email", "phone", "age", "city", "institution"],
  ["experience", "hearAbout"],
  ["committeePrefs"],
  ["consent"],
];

export const DELEGATION_STEP_FIELDS: string[][] = [
  ["institutionName", "institutionCity", "institutionType"],
  ["headName", "headEmail", "headPhone", "headRole"],
  ["delegationSize", "accommodationCount"],
  ["consent"],
];

export function validateDelegate(
  values: DelegateApplication,
  validCommitteeSlugs: readonly string[],
): FieldErrors {
  const prefs = values.committeePrefs.filter(Boolean);
  const distinct = new Set(prefs);

  let prefError: string | null = null;
  if (prefs.length < 3) {
    prefError = "Rank three committees, in order of preference.";
  } else if (distinct.size !== prefs.length) {
    prefError = "Pick three different committees.";
  } else if (prefs.some((slug) => !validCommitteeSlugs.includes(slug))) {
    prefError = "One of those committees is no longer available.";
  }

  return prune({
    fullName: minLength(values.fullName, 2, "Full name"),
    email: validEmail(values.email),
    phone: validPhone(values.phone),
    age: inRange(values.age, MIN_AGE, MAX_AGE, "Age"),
    city: required(values.city, "City"),
    institution: minLength(values.institution, 2, "Institution"),
    experience: oneOf(values.experience, EXPERIENCE_LEVELS, "Experience level"),
    hearAbout: oneOf(values.hearAbout, HEAR_ABOUT, "Answer"),
    committeePrefs: prefError,
    consent: values.consent
      ? null
      : "Please confirm the information you have given is accurate.",
  });
}

export function validateDelegation(
  values: DelegationApplication,
  validCommitteeSlugs: readonly string[],
): FieldErrors {
  const accommodationError =
    Number.isNaN(values.accommodationCount) ||
    values.accommodationCount < 0 ||
    values.accommodationCount > values.delegationSize
      ? `Between 0 and your delegation size (${values.delegationSize || MAX_DELEGATION}).`
      : null;

  const spreadError = values.committeeSpread.some(
    (slug) => !validCommitteeSlugs.includes(slug),
  )
    ? "One of those committees is no longer available."
    : null;

  return prune({
    institutionName: minLength(values.institutionName, 2, "Institution name"),
    institutionCity: required(values.institutionCity, "City"),
    institutionType: oneOf(
      values.institutionType,
      INSTITUTION_TYPES,
      "Institution type",
    ),
    headName: minLength(values.headName, 2, "Your name"),
    headEmail: validEmail(values.headEmail),
    headPhone: validPhone(values.headPhone),
    headRole: required(values.headRole, "Your role"),
    delegationSize: inRange(
      values.delegationSize,
      MIN_DELEGATION,
      MAX_DELEGATION,
      "Delegation size",
    ),
    accommodationCount: accommodationError,
    committeeSpread: spreadError,
    consent: values.consent
      ? null
      : "Please confirm you are authorised to register this delegation.",
  });
}

export function validateContact(values: ContactMessage): FieldErrors {
  return prune({
    name: minLength(values.name, 2, "Name"),
    email: validEmail(values.email),
    topic: oneOf(values.topic, CONTACT_TOPICS, "Topic"),
    subject: minLength(values.subject, 3, "Subject"),
    message: minLength(values.message, 20, "Message"),
  });
}
