/**
 * Shared domain types. These are written as if they were table definitions so a
 * future backend is a transcription rather than a redesign. Nothing in this file
 * imports anything.
 */

/* ── Content ─────────────────────────────────────────────────────────────── */

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type CommitteeType =
  | "general-assembly"
  | "specialised"
  | "crisis"
  | "press";

export type ChairRole = "Chair" | "Vice Chair" | "Director";

export type Chair = {
  name: string;
  role: ChairRole | string;
  initials: string;
};

export type Committee = {
  slug: string;
  name: string;
  abbr: string;
  type: CommitteeType;
  difficulty: Difficulty;
  agenda: string;
  overview: string;
  focusPoints: string[];
  seats: number;
  chairs: Chair[];
  backgroundGuideUrl: string | null;
  featured: boolean;
};

export type BoardTier = "secretariat" | "directorate";

export type BoardMember = {
  id: string;
  name: string;
  role: string;
  tier: BoardTier;
  bio: string;
  initials: string;
  email: string | null;
  /** Portrait uploaded in the admin panel; initials medallion when absent. */
  photoUrl?: string | null;
};

export type ScheduleKind =
  | "ceremony"
  | "session"
  | "break"
  | "social"
  | "logistics";

export type ScheduleItem = {
  id: string;
  start: string;
  end: string;
  title: string;
  kind: ScheduleKind;
  venue: string;
  description: string | null;
};

/**
 * `date` is nullable by design — conference dates are unannounced. Every
 * consumer renders the "to be announced" state rather than inventing a date.
 */
export type ScheduleDay = {
  id: string;
  date: string | null;
  label: string;
  theme: string;
  items: ScheduleItem[];
};

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  topics: FaqTopic[];
};

export type FaqTopic = "registration" | "committees" | "logistics" | "fees";

export type Stat = {
  id: string;
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
};

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; description: string }[];
};

export type ContactChannel = {
  id: string;
  label: string;
  value: string;
  href: string | null;
  note: string;
};

/* ── Applications ────────────────────────────────────────────────────────── */

export type ExperienceLevel = "first-time" | "1-3" | "4-9" | "10-plus";

export type HearAbout =
  | "instagram"
  | "school"
  | "friend"
  | "alumni"
  | "other";

export type DelegateApplication = {
  fullName: string;
  email: string;
  phone: string;
  institution: string;
  city: string;
  experience: ExperienceLevel;
  priorAwards: string | null;
  committeePrefs: string[];
  accommodation: boolean;
  dietary: string | null;
  hearAbout: HearAbout;
  consent: boolean;
};

export type InstitutionType =
  | "school"
  | "college"
  | "university"
  | "mun-society"
  | "other";

/** One student on a delegation roster. Every member gets their own seat. */
export type DelegationMember = {
  fullName: string;
  email: string;
  phone: string;
  experience: ExperienceLevel;
  priorAwards: string | null;
  committeePrefs: string[];
};

export type DelegationApplication = {
  institutionName: string;
  institutionCity: string;
  institutionType: InstitutionType;
  headName: string;
  headEmail: string;
  headPhone: string;
  headRole: string;
  /** Always equals `members.length` — derived, kept for the summary and invoice. */
  delegationSize: number;
  members: DelegationMember[];
  facultyAccompanying: boolean;
  committeeSpread: string[];
  accommodationCount: number;
  notes: string | null;
  consent: boolean;
};

export type ContactTopic =
  | "registration"
  | "delegation"
  | "sponsorship"
  | "press"
  | "other";

export type ContactMessage = {
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
};

/* ── Submissions & results ───────────────────────────────────────────────── */

export type SubmissionKind = "delegate" | "delegation" | "contact";

export type Submission = {
  reference: string;
  kind: SubmissionKind;
  receivedAt: string;
  name: string;
};

export type ApplicationStatus =
  | "received"
  | "under-review"
  | "allocated"
  | "confirmed"
  | "not-found";

export type StatusResult = {
  reference: string;
  status: ApplicationStatus;
  committee: string | null;
  note: string;
};

/* ── Action plumbing ─────────────────────────────────────────────────────── */

export type FieldErrors = Record<string, string>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors; message?: string };
