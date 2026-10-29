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
  /** Two delegates share each country (e.g. UNSC). */
  doubleDelegate: boolean;
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
 * `date` is nullable: days without one fall back to the conference dates. Every
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
  /** Fee tier: with social (true) or without social (false). */
  withSocial: boolean;
  hearAbout: HearAbout;
  /** Optional: who referred them (an ambassador, team member or friend). */
  referredBy: string | null;
  /**
   * Only when the first choice is a double-delegate committee: be paired with
   * a random co-delegate, or bring one (and pay for both).
   */
  coDelegate: CoDelegateChoice | null;
  consent: boolean;
};

/** The co-delegate an individual brings to a double-delegate committee. */
export type CoDelegatePartner = {
  fullName: string;
  email: string;
  phone: string;
  experience: ExperienceLevel;
};

export type CoDelegateChoice =
  | { mode: "random" }
  | ({ mode: "partner" } & CoDelegatePartner);

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
  /** Fee tier: with social (true) or without social (false). */
  withSocial: boolean;
};

export type DelegationApplication = {
  institutionName: string;
  institutionCity: string;
  institutionType: InstitutionType;
  headName: string;
  headEmail: string;
  headPhone: string;
  headRole: string;
  /** Optional: who referred the delegation. */
  referredBy: string | null;
  /** Always equals `members.length`, derived, kept for the summary and invoice. */
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
  /** Individual registrations: the code to quote as the payment reference. */
  delegateCode?: string;
  /** Registrations: the fee quoted in the confirmation email. */
  fee?: { currency: string; amount: number };
  /** False when the confirmation email could not be sent. */
  emailSent?: boolean;
  /** The co-delegate this registrant brought (and paid for). */
  coDelegate?: { name: string; delegateCode: string } | null;
  /** Registrations: how to pay, shown with the codes. */
  payment?: PaymentDetails;
};

export type PaymentAccount = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
  branch: string | null;
  instructions: string | null;
};

export type PaymentDetails = {
  accounts: PaymentAccount[];
  /** Site-relative path of the page where the payer uploads the screenshot. */
  uploadUrl: string;
};

/* ── Action plumbing ─────────────────────────────────────────────────────── */

export type FieldErrors = Record<string, string>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors; message?: string };
