/**
 * Admin-panel domain types. Shaped as table rows so Supabase queries map
 * without a redesign. Reuses shared application enums from `lib/types`.
 */

import type {
  CommitteeType,
  ContactTopic,
  Difficulty,
  ExperienceLevel,
  HearAbout,
  InstitutionType,
} from "@/lib/types";

/* ── Enums ───────────────────────────────────────────────────────────────── */

export type AdminRole = "admin" | "eb" | "reviewer";

export type PaymentStatus = "pending" | "confirmed" | "rejected";

export type AllotmentSource = "merit" | "manual";

export type AllotmentStatus = "draft" | "confirmed";

export type QueryStatus = "open" | "answered" | "archived";

export type FeeType =
  | "delegate"
  | "delegation_member"
  | "early_bird_delegate"
  | "early_bird_delegation_member";

/* ── Profiles / team ─────────────────────────────────────────────────────── */

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ── Pricing / bank ──────────────────────────────────────────────────────── */

export type PricingSettings = {
  id: number;
  currency: string;
  delegateFee: number;
  delegationFee: number;
  perDelegateFee: number;
  delegationMin: number;
  delegationMax: number;
  earlyBirdEnabled: boolean;
  earlyBirdDelegateFee: number | null;
  earlyBirdPerDelegateFee: number | null;
  earlyBirdEndsAt: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type BankAccount = {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
  branch: string | null;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

/* ── Registrations ───────────────────────────────────────────────────────── */

export type DelegateRecord = {
  id: string;
  reference: string;
  delegateCode: string;
  fullName: string;
  email: string;
  phone: string;
  institution: string;
  age: number;
  city: string;
  experience: ExperienceLevel;
  priorAwards: string | null;
  committeePrefs: string[];
  accommodation: boolean;
  dietary: string | null;
  hearAbout: HearAbout;
  paymentStatus: PaymentStatus;
  paymentAmount: number | null;
  paymentConfirmedAt: string | null;
  paymentRejectedAt: string | null;
  rejectionReason: string | null;
  delegationId: string | null;
  feeType: FeeType;
  createdAt: string;
  updatedAt: string;
};

export type DelegationRecord = {
  id: string;
  reference: string;
  institutionName: string;
  institutionCity: string;
  institutionType: InstitutionType;
  headName: string;
  headEmail: string;
  headPhone: string;
  headRole: string;
  delegationSize: number;
  facultyAccompanying: boolean;
  committeeSpread: string[];
  accommodationCount: number;
  notes: string | null;
  paymentStatus: PaymentStatus;
  paymentAmount: number | null;
  createdAt: string;
  updatedAt: string;
};

/* ── Committees / portfolios / allotments ────────────────────────────────── */

export type CommitteeAdminRecord = {
  id: string;
  slug: string;
  name: string;
  abbr: string;
  type: CommitteeType;
  difficulty: Difficulty;
  hardnessScore: number;
  agenda: string;
  overview: string;
  focusPoints: string[];
  seats: number;
  studyGuidePath: string | null;
  studyGuideUrl: string | null;
  featured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Portfolio = {
  id: string;
  committeeId: string;
  countryName: string;
  isP5: boolean;
  hardness: number;
  notes: string | null;
  isActive: boolean;
};

export type AllotmentRecord = {
  id: string;
  delegateId: string;
  committeeId: string;
  portfolioId: string;
  source: AllotmentSource;
  status: AllotmentStatus;
  rationale: string | null;
  score: number | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ── People / content CMS ────────────────────────────────────────────────── */

export type EbMemberRecord = {
  id: string;
  name: string;
  role: string;
  bio: string;
  email: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  initials: string;
  sortOrder: number;
  isPublished: boolean;
};

export type HodRecord = {
  id: string;
  name: string;
  role: string;
  bio: string;
  email: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  initials: string;
  sortOrder: number;
  isPublished: boolean;
};

export type SecretariatMemberRecord = {
  id: string;
  committeeId: string;
  name: string;
  role: string;
  initials: string;
  sortOrder: number;
};

export type SponsorRecord = {
  id: string;
  name: string;
  logoPath: string | null;
  logoUrl: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
};

export type QueryRecord = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  status: QueryStatus;
  replyBody: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  createdAt: string;
};

export type ScheduleItemRecord = {
  id: string;
  dayId: string;
  start: string;
  end: string;
  title: string;
  kind: "ceremony" | "session" | "break" | "social" | "logistics";
  venue: string;
  description: string | null;
  sortOrder: number;
};

export type ScheduleDayRecord = {
  id: string;
  date: string | null;
  label: string;
  theme: string;
  sortOrder: number;
  items: ScheduleItemRecord[];
};

/* ── Overview ────────────────────────────────────────────────────────────── */

export type OverviewKpis = {
  totalDelegates: number;
  totalRegistrations: number;
  delegationCount: number;
  pendingPayments: number;
  confirmedPayments: number;
  totalAmount: number;
  openQueries: number;
  allottedDraft: number;
  allottedConfirmed: number;
};

/* ── Filters ─────────────────────────────────────────────────────────────── */

export type DelegateFilters = {
  search?: string;
  paymentStatus?: PaymentStatus;
  experience?: ExperienceLevel;
  institution?: string;
  preferredCommittee?: string;
};
