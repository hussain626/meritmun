/**
 * Rich offline seed for the admin UI when Supabase is not configured.
 * Imports live content so portfolios / EB / HODs / chairs stay aligned with
 * the public site.
 */

import { boardMembers } from "@/content/board";
import { committees } from "@/content/committees";
import { scheduleDays as publicScheduleDays } from "@/content/schedule";
import { pricing } from "@/content/site";
import type { AnnouncementSettings } from "@/lib/admin/announcement";
import type { ConferenceSettings } from "@/lib/admin/conference";
import type {
  AllotmentRecord,
  BankAccount,
  CommitteeAdminRecord,
  DelegateRecord,
  DelegationRecord,
  EbMemberRecord,
  HodRecord,
  OverviewKpis,
  Portfolio,
  PricingSettings,
  Profile,
  QueryRecord,
  ScheduleDayRecord,
  SecretariatMemberRecord,
  SponsorRecord,
} from "@/lib/admin/types";
import { isP5Country } from "@/lib/merit/p5";

const NOW = "2026-08-20T10:00:00.000Z";
const WEEK_AGO = "2026-08-13T09:30:00.000Z";
const DAYS_AGO = (n: number) =>
  new Date(Date.parse(NOW) - n * 24 * 60 * 60 * 1000).toISOString();

/* ── Stable IDs ──────────────────────────────────────────────────────────── */

const ids = {
  pricing: 1,
  bankHbl: "bank-hbl-001",
  bankMeezan: "bank-meezan-002",
  delAga: "del-aga-khan",
  delBeacon: "del-beaconhouse",
  delLums: "del-lums",
} as const;

function committeeId(slug: string): string {
  return `committee-${slug}`;
}

function portfolioId(committeeSlug: string, country: string): string {
  const key = country.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `portfolio-${committeeSlug}-${key}`;
}

function hardnessForDifficulty(
  difficulty: (typeof committees)[number]["difficulty"],
): number {
  switch (difficulty) {
    case "beginner":
      return 3;
    case "intermediate":
      return 6;
    case "advanced":
      return 9;
  }
}

/* ── Committees (from content) ───────────────────────────────────────────── */

export const demoCommittees: CommitteeAdminRecord[] = committees.map(
  (committee, index) => ({
    id: committeeId(committee.slug),
    slug: committee.slug,
    name: committee.name,
    abbr: committee.abbr,
    type: committee.type,
    difficulty: committee.difficulty,
    hardnessScore: hardnessForDifficulty(committee.difficulty),
    agenda: committee.agenda,
    overview: committee.overview,
    focusPoints: [...committee.focusPoints],
    seats: committee.seats,
    studyGuidePath: null,
    studyGuideUrl: committee.backgroundGuideUrl,
    featured: committee.featured,
    isPublished: true,
    sortOrder: index + 1,
    createdAt: WEEK_AGO,
    updatedAt: NOW,
  }),
);

/* ── Portfolios (UNSC + DISEC sample seats, including P5) ────────────────── */

type PortfolioSeed = {
  committeeSlug: string;
  countryName: string;
  hardness: number;
  notes?: string;
};

const PORTFOLIO_SEEDS: PortfolioSeed[] = [
  // UNSC — includes P5 (never auto-allotted)
  { committeeSlug: "unsc", countryName: "USA", hardness: 10 },
  { committeeSlug: "unsc", countryName: "China", hardness: 10 },
  { committeeSlug: "unsc", countryName: "Russia", hardness: 10 },
  { committeeSlug: "unsc", countryName: "United Kingdom", hardness: 9 },
  { committeeSlug: "unsc", countryName: "France", hardness: 9 },
  { committeeSlug: "unsc", countryName: "Iran", hardness: 9, notes: "Agenda-critical" },
  { committeeSlug: "unsc", countryName: "India", hardness: 7 },
  { committeeSlug: "unsc", countryName: "Japan", hardness: 6 },
  { committeeSlug: "unsc", countryName: "Brazil", hardness: 6 },
  { committeeSlug: "unsc", countryName: "South Africa", hardness: 5 },
  { committeeSlug: "unsc", countryName: "Pakistan", hardness: 7 },
  { committeeSlug: "unsc", countryName: "Egypt", hardness: 5 },
  // DISEC
  { committeeSlug: "disec", countryName: "Germany", hardness: 8 },
  { committeeSlug: "disec", countryName: "South Korea", hardness: 8 },
  { committeeSlug: "disec", countryName: "Israel", hardness: 9 },
  { committeeSlug: "disec", countryName: "Türkiye", hardness: 7 },
  { committeeSlug: "disec", countryName: "Canada", hardness: 5 },
  { committeeSlug: "disec", countryName: "Mexico", hardness: 4 },
  { committeeSlug: "disec", countryName: "Indonesia", hardness: 6 },
  { committeeSlug: "disec", countryName: "Nigeria", hardness: 5 },
  // UNEP (beginner-friendly)
  { committeeSlug: "unep", countryName: "Bangladesh", hardness: 6 },
  { committeeSlug: "unep", countryName: "Nepal", hardness: 5 },
  { committeeSlug: "unep", countryName: "Kenya", hardness: 4 },
  { committeeSlug: "unep", countryName: "Chile", hardness: 4 },
];

export const demoPortfolios: Portfolio[] = PORTFOLIO_SEEDS.map((seed) => ({
  id: portfolioId(seed.committeeSlug, seed.countryName),
  committeeId: committeeId(seed.committeeSlug),
  countryName: seed.countryName,
  isP5: isP5Country(seed.countryName),
  hardness: seed.hardness,
  notes: seed.notes ?? null,
  isActive: true,
}));

/* ── Pricing / bank ──────────────────────────────────────────────────────── */

export const demoPricing: PricingSettings = {
  id: ids.pricing,
  currency: pricing.currency,
  delegateFee: pricing.delegate,
  delegationFee: 0,
  perDelegateFee: pricing.delegationStandard,
  delegationMin: pricing.minDelegation,
  delegationMax: pricing.maxDelegation,
  earlyBirdEnabled: false,
  earlyBirdDelegateFee: null,
  earlyBirdPerDelegateFee: null,
  earlyBirdEndsAt: null,
  updatedAt: NOW,
  updatedBy: null,
};

export const demoAnnouncement: AnnouncementSettings = {
  id: 1,
  isActive: true,
  message: "Study guides are now available — open Committees to download yours.",
  linkType: "internal",
  internalPath: "/committees",
  externalUrl: null,
  updatedAt: NOW,
  updatedBy: null,
};

export const demoConference: ConferenceSettings = {
  id: 1,
  registrationOpen: false,
  updatedAt: NOW,
  updatedBy: null,
};

export const demoSchedule: ScheduleDayRecord[] = publicScheduleDays.map(
  (day, dayIndex) => ({
    id: day.id,
    date: day.date,
    label: day.label,
    theme: day.theme,
    sortOrder: dayIndex + 1,
    items: day.items.map((item, itemIndex) => ({
      id: item.id,
      dayId: day.id,
      start: item.start,
      end: item.end,
      title: item.title,
      kind: item.kind,
      venue: item.venue,
      description: item.description,
      sortOrder: itemIndex + 1,
    })),
  }),
);

export const demoBankAccounts: BankAccount[] = [
  {
    id: ids.bankHbl,
    bankName: "Habib Bank Limited (HBL)",
    accountTitle: "Meritorious Model United Nations",
    accountNumber: "0012-7901234567",
    iban: "PK36HABB00127901234567",
    branch: "Clifton Branch, Karachi",
    instructions:
      "Use your delegate code as the payment reference. Share the screenshot with Delegate Affairs.",
    isActive: true,
    sortOrder: 1,
    createdAt: WEEK_AGO,
  },
  {
    id: ids.bankMeezan,
    bankName: "Meezan Bank",
    accountTitle: "MERITMUN III Conference Account",
    accountNumber: "0123-4567890123",
    iban: "PK12MEZN01234567890123",
    branch: "Shahrah-e-Faisal, Karachi",
    instructions: "Islamic banking option for institutional wire transfers.",
    isActive: true,
    sortOrder: 2,
    createdAt: WEEK_AGO,
  },
];

/* ── Delegations ─────────────────────────────────────────────────────────── */

export const demoDelegations: DelegationRecord[] = [
  {
    id: ids.delAga,
    reference: "MMIII-AGAKHN",
    institutionName: "Aga Khan Higher Secondary School",
    institutionCity: "Karachi",
    institutionType: "school",
    headName: "Sana Rizvi",
    headEmail: "sana.rizvi@akhss.edu.pk",
    headPhone: "+92 300 1112233",
    headRole: "Faculty Advisor",
    delegationSize: 8,
    facultyAccompanying: true,
    committeeSpread: ["unsc", "disec", "unep", "youth-assembly"],
    accommodationCount: 6,
    notes: "Prefer mixed GA and specialised seats.",
    paymentStatus: "confirmed",
    paymentAmount: 8 * pricing.delegationStandard,
    createdAt: DAYS_AGO(12),
    updatedAt: DAYS_AGO(3),
  },
  {
    id: ids.delBeacon,
    reference: "MMIII-BEACON",
    institutionName: "Beaconhouse College Programme",
    institutionCity: "Lahore",
    institutionType: "college",
    headName: "Omar Khalid",
    headEmail: "omar.khalid@beaconhouse.edu.pk",
    headPhone: "+92 321 4455667",
    headRole: "MUN Society President",
    delegationSize: 12,
    facultyAccompanying: false,
    committeeSpread: ["unhrc", "who", "ecosoc", "press-corps"],
    accommodationCount: 12,
    notes: null,
    paymentStatus: "pending",
    paymentAmount: null,
    createdAt: DAYS_AGO(6),
    updatedAt: DAYS_AGO(6),
  },
  {
    id: ids.delLums,
    reference: "MMIII-LUMSMN",
    institutionName: "LUMS Model UN Society",
    institutionCity: "Lahore",
    institutionType: "mun-society",
    headName: "Hira Qureshi",
    headEmail: "hira.q@lums.edu.pk",
    headPhone: "+92 333 7788990",
    headRole: "Society Head",
    delegationSize: 15,
    facultyAccompanying: true,
    committeeSpread: ["unsc", "historic-crisis", "joint-crisis", "unodc"],
    accommodationCount: 10,
    notes: "Experienced crisis delegates; request backroom briefings early.",
    paymentStatus: "confirmed",
    paymentAmount: 15 * pricing.delegationLarge,
    createdAt: DAYS_AGO(18),
    updatedAt: DAYS_AGO(2),
  },
];

/* ── Delegates ───────────────────────────────────────────────────────────── */

export const demoDelegates: DelegateRecord[] = [
  {
    id: "delg-001",
    reference: "MMIII-4KQ7ZP",
    delegateCode: "DC-A1B2C3",
    fullName: "Ayesha Malik",
    email: "ayesha.malik@example.com",
    phone: "+92 300 5550101",
    institution: "Karachi Grammar School",
    age: 17,
    city: "Karachi",
    experience: "10-plus",
    priorAwards: "Best Delegate — KarachiMUN 2025; Outstanding — LUMUN",
    committeePrefs: ["unsc", "unodc", "disec"],
    accommodation: false,
    dietary: null,
    hearAbout: "alumni",
    paymentStatus: "confirmed",
    paymentAmount: pricing.delegate,
    paymentConfirmedAt: DAYS_AGO(4),
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: null,
    feeType: "delegate",
    createdAt: DAYS_AGO(14),
    updatedAt: DAYS_AGO(4),
  },
  {
    id: "delg-002",
    reference: "MMIII-9M2XPL",
    delegateCode: "DC-D4E5F6",
    fullName: "Bilal Hussain",
    email: "bilal.hussain@example.com",
    phone: "+92 321 5550202",
    institution: "Aga Khan Higher Secondary School",
    age: 16,
    city: "Karachi",
    experience: "4-9",
    priorAwards: "Verbal Commendation — MERITMUN II",
    committeePrefs: ["unsc", "disec", "who"],
    accommodation: true,
    dietary: "Halal only",
    hearAbout: "school",
    paymentStatus: "confirmed",
    paymentAmount: pricing.delegationStandard,
    paymentConfirmedAt: DAYS_AGO(3),
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: ids.delAga,
    feeType: "delegation_member",
    createdAt: DAYS_AGO(12),
    updatedAt: DAYS_AGO(3),
  },
  {
    id: "delg-003",
    reference: "MMIII-7HT4WN",
    delegateCode: "DC-G7H8I9",
    fullName: "Fatima Zahra",
    email: "fatima.zahra@example.com",
    phone: "+92 333 5550303",
    institution: "Aga Khan Higher Secondary School",
    age: 15,
    city: "Karachi",
    experience: "1-3",
    priorAwards: null,
    committeePrefs: ["unep", "youth-assembly", "ecosoc"],
    accommodation: true,
    dietary: null,
    hearAbout: "school",
    paymentStatus: "confirmed",
    paymentAmount: pricing.delegationStandard,
    paymentConfirmedAt: DAYS_AGO(3),
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: ids.delAga,
    feeType: "delegation_member",
    createdAt: DAYS_AGO(12),
    updatedAt: DAYS_AGO(3),
  },
  {
    id: "delg-004",
    reference: "MMIII-2BR8QD",
    delegateCode: "DC-J1K2L3",
    fullName: "Hassan Raza",
    email: "hassan.raza@example.com",
    phone: "+92 345 5550404",
    institution: "Beaconhouse College Programme",
    age: 18,
    city: "Lahore",
    experience: "4-9",
    priorAwards: "Best Position Paper — PU MUN",
    committeePrefs: ["unhrc", "who", "unodc"],
    accommodation: true,
    dietary: "Vegetarian",
    hearAbout: "friend",
    paymentStatus: "pending",
    paymentAmount: null,
    paymentConfirmedAt: null,
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: ids.delBeacon,
    feeType: "delegation_member",
    createdAt: DAYS_AGO(6),
    updatedAt: DAYS_AGO(6),
  },
  {
    id: "delg-005",
    reference: "MMIII-5CV1SK",
    delegateCode: "DC-M4N5O6",
    fullName: "Iman Siddiqui",
    email: "iman.siddiqui@example.com",
    phone: "+92 312 5550505",
    institution: "Lahore Grammar School",
    age: 17,
    city: "Lahore",
    experience: "first-time",
    priorAwards: null,
    committeePrefs: ["youth-assembly", "unep", "press-corps"],
    accommodation: false,
    dietary: null,
    hearAbout: "instagram",
    paymentStatus: "pending",
    paymentAmount: null,
    paymentConfirmedAt: null,
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: null,
    feeType: "delegate",
    createdAt: DAYS_AGO(5),
    updatedAt: DAYS_AGO(5),
  },
  {
    id: "delg-006",
    reference: "MMIII-8DW6TJ",
    delegateCode: "DC-P7Q8R9",
    fullName: "Junaid Ahmed",
    email: "junaid.ahmed@example.com",
    phone: "+92 301 5550606",
    institution: "LUMS Model UN Society",
    age: 20,
    city: "Lahore",
    experience: "10-plus",
    priorAwards: "Best Delegate — Harvard WorldMUN 2025",
    committeePrefs: ["historic-crisis", "joint-crisis", "unsc"],
    accommodation: true,
    dietary: null,
    hearAbout: "alumni",
    paymentStatus: "confirmed",
    paymentAmount: pricing.delegationLarge,
    paymentConfirmedAt: DAYS_AGO(2),
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: ids.delLums,
    feeType: "delegation_member",
    createdAt: DAYS_AGO(18),
    updatedAt: DAYS_AGO(2),
  },
  {
    id: "delg-007",
    reference: "MMIII-3EX9UM",
    delegateCode: "DC-S1T2U3",
    fullName: "Komal Nadeem",
    email: "komal.nadeem@example.com",
    phone: "+92 334 5550707",
    institution: "Nixor College",
    age: 18,
    city: "Karachi",
    experience: "1-3",
    priorAwards: null,
    committeePrefs: ["disec", "ecosoc", "national-assembly"],
    accommodation: false,
    dietary: "Nut allergy",
    hearAbout: "friend",
    paymentStatus: "rejected",
    paymentAmount: null,
    paymentConfirmedAt: null,
    paymentRejectedAt: DAYS_AGO(1),
    rejectionReason: "Transfer screenshot did not match the stated amount.",
    delegationId: null,
    feeType: "delegate",
    createdAt: DAYS_AGO(8),
    updatedAt: DAYS_AGO(1),
  },
  {
    id: "delg-008",
    reference: "MMIII-6FY2VN",
    delegateCode: "DC-V4W5X6",
    fullName: "Laiba Khan",
    email: "laiba.khan@example.com",
    phone: "+92 322 5550808",
    institution: "Roots Millennium School",
    age: 16,
    city: "Islamabad",
    experience: "4-9",
    priorAwards: "Outstanding Delegate — Islamabad MUN",
    committeePrefs: ["who", "unhrc", "ecosoc"],
    accommodation: true,
    dietary: null,
    hearAbout: "instagram",
    paymentStatus: "confirmed",
    paymentAmount: pricing.delegate,
    paymentConfirmedAt: DAYS_AGO(7),
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: null,
    feeType: "delegate",
    createdAt: DAYS_AGO(10),
    updatedAt: DAYS_AGO(7),
  },
  {
    id: "delg-009",
    reference: "MMIII-1GZ5WO",
    delegateCode: "DC-Y7Z8A9",
    fullName: "Muhammad Ali",
    email: "m.ali@example.com",
    phone: "+92 315 5550909",
    institution: "Cadet College Petaro",
    age: 17,
    city: "Hyderabad",
    experience: "first-time",
    priorAwards: null,
    committeePrefs: ["youth-assembly", "unep", "press-corps"],
    accommodation: true,
    dietary: null,
    hearAbout: "school",
    paymentStatus: "pending",
    paymentAmount: null,
    paymentConfirmedAt: null,
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: null,
    feeType: "delegate",
    createdAt: DAYS_AGO(2),
    updatedAt: DAYS_AGO(2),
  },
  {
    id: "delg-010",
    reference: "MMIII-0HA8XP",
    delegateCode: "DC-B1C2D3",
    fullName: "Noor ul Ain",
    email: "noor.ulain@example.com",
    phone: "+92 300 5551010",
    institution: "IBA University",
    age: 21,
    city: "Karachi",
    experience: "10-plus",
    priorAwards: "Best Crisis Delegate — NUSTMUN",
    committeePrefs: ["joint-crisis", "historic-crisis", "unodc"],
    accommodation: false,
    dietary: null,
    hearAbout: "other",
    paymentStatus: "confirmed",
    paymentAmount: pricing.delegate,
    paymentConfirmedAt: DAYS_AGO(5),
    paymentRejectedAt: null,
    rejectionReason: null,
    delegationId: null,
    feeType: "delegate",
    createdAt: DAYS_AGO(11),
    updatedAt: DAYS_AGO(5),
  },
];

/* ── Allotments ──────────────────────────────────────────────────────────── */

export const demoAllotments: AllotmentRecord[] = [
  {
    id: "allot-001",
    delegateId: "delg-001",
    committeeId: committeeId("unsc"),
    portfolioId: portfolioId("unsc", "Iran"),
    source: "merit",
    status: "confirmed",
    rationale:
      "High experience + agenda relevance for Hormuz maritime security; non-P5.",
    score: 0.92,
    confirmedAt: DAYS_AGO(3),
    confirmedBy: "profile-admin",
    createdAt: DAYS_AGO(4),
    updatedAt: DAYS_AGO(3),
  },
  {
    id: "allot-002",
    delegateId: "delg-002",
    committeeId: committeeId("unsc"),
    portfolioId: portfolioId("unsc", "Pakistan"),
    source: "merit",
    status: "draft",
    rationale: "Strong preference for UNSC; mid-high hardness match.",
    score: 0.81,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: DAYS_AGO(3),
    updatedAt: DAYS_AGO(3),
  },
  {
    id: "allot-003",
    delegateId: "delg-003",
    committeeId: committeeId("unep"),
    portfolioId: portfolioId("unep", "Bangladesh"),
    source: "merit",
    status: "draft",
    rationale: "Beginner-friendly committee with agenda-relevant seat.",
    score: 0.74,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: DAYS_AGO(3),
    updatedAt: DAYS_AGO(3),
  },
  {
    id: "allot-004",
    delegateId: "delg-006",
    committeeId: committeeId("unsc"),
    portfolioId: portfolioId("unsc", "USA"),
    source: "manual",
    status: "draft",
    rationale: "EB override — P5 requested for exhibition debate.",
    score: null,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: DAYS_AGO(2),
    updatedAt: DAYS_AGO(2),
  },
  {
    id: "allot-005",
    delegateId: "delg-008",
    committeeId: committeeId("disec"),
    portfolioId: portfolioId("disec", "Germany"),
    source: "merit",
    status: "confirmed",
    rationale: "LAWS agenda fit; experienced intermediate delegate.",
    score: 0.86,
    confirmedAt: DAYS_AGO(6),
    confirmedBy: "profile-eb",
    createdAt: DAYS_AGO(7),
    updatedAt: DAYS_AGO(6),
  },
  {
    id: "allot-006",
    delegateId: "delg-010",
    committeeId: committeeId("disec"),
    portfolioId: portfolioId("disec", "Israel"),
    source: "merit",
    status: "draft",
    rationale: "Crisis-experienced delegate on high-hardness DISEC seat.",
    score: 0.88,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: DAYS_AGO(5),
    updatedAt: DAYS_AGO(5),
  },
];

/* ── EB / HODs / Secretariat (from board + committee chairs) ─────────────── */

export const demoEbMembers: EbMemberRecord[] = boardMembers
  .filter((member) => member.tier === "secretariat")
  .map((member, index) => ({
    id: `eb-${member.id}`,
    name: member.name,
    role: member.role,
    bio: member.bio,
    email: member.email,
    photoPath: null,
    photoUrl: null,
    initials: member.initials,
    sortOrder: index + 1,
    isPublished: true,
  }));

export const demoHods: HodRecord[] = boardMembers
  .filter((member) => member.tier === "directorate")
  .map((member, index) => ({
    id: `hod-${member.id}`,
    name: member.name,
    role: member.role,
    bio: member.bio,
    email: member.email,
    photoPath: null,
    photoUrl: null,
    initials: member.initials,
    sortOrder: index + 1,
    isPublished: true,
  }));

export const demoSecretariat: SecretariatMemberRecord[] = committees.flatMap(
  (committee) =>
    committee.chairs.map((chair, index) => ({
      id: `sec-${committee.slug}-${index}`,
      committeeId: committeeId(committee.slug),
      name: chair.name,
      role: chair.role,
      initials: chair.initials,
      sortOrder: index + 1,
    })),
);

/* ── Sponsors / queries / team ───────────────────────────────────────────── */

export const demoSponsors: SponsorRecord[] = [
  {
    id: "sponsor-001",
    name: "Meritorious Education System",
    logoPath: null,
    logoUrl: "/sponsors/meritorious.svg",
    url: "https://meritorious.edu.pk",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "sponsor-002",
    name: "HBL",
    logoPath: null,
    logoUrl: "/sponsors/hbl.svg",
    url: "https://www.hbl.com",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "sponsor-003",
    name: "Nestlé Pakistan",
    logoPath: null,
    logoUrl: "/sponsors/nestle.svg",
    url: "https://www.nestle.pk",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "sponsor-004",
    name: "Jazz",
    logoPath: null,
    logoUrl: "/sponsors/jazz.svg",
    url: "https://jazz.com.pk",
    sortOrder: 4,
    isActive: false,
  },
];

export const demoQueries: QueryRecord[] = [
  {
    id: "query-001",
    name: "Sara Ahmed",
    email: "sara.ahmed@example.com",
    topic: "registration",
    subject: "Early bird deadline?",
    message:
      "Is there still an early-bird window for individual delegates registering from outside Karachi?",
    status: "answered",
    replyBody:
      "Early bird is currently off. Standard delegate fee applies — see the Register page for the live amount.",
    repliedAt: DAYS_AGO(1),
    repliedBy: "profile-eb",
    createdAt: DAYS_AGO(2),
  },
  {
    id: "query-002",
    name: "Faculty Advisor — LGS",
    email: "mun@lgs.edu.pk",
    topic: "delegation",
    subject: "Invoice for 10 delegates",
    message:
      "We need a pro-forma invoice addressed to Lahore Grammar School for a 10-member delegation.",
    status: "open",
    replyBody: null,
    repliedAt: null,
    repliedBy: null,
    createdAt: DAYS_AGO(1),
  },
  {
    id: "query-003",
    name: "Press applicant",
    email: "reporter@example.com",
    topic: "press",
    subject: "Press Corps equipment",
    message:
      "Does the Press Corps provide cameras, or should delegates bring their own?",
    status: "open",
    replyBody: null,
    repliedAt: null,
    repliedBy: null,
    createdAt: DAYS_AGO(0),
  },
  {
    id: "query-004",
    name: "Corporate CSR",
    email: "csr@brand.pk",
    topic: "sponsorship",
    subject: "Gold-tier sponsorship deck",
    message:
      "Please share the sponsorship prospectus and logo placement options for the home slider.",
    status: "archived",
    replyBody: "Deck sent; following up after their board meeting.",
    repliedAt: DAYS_AGO(9),
    repliedBy: "profile-admin",
    createdAt: DAYS_AGO(10),
  },
  {
    id: "query-005",
    name: "Parent",
    email: "parent@example.com",
    topic: "other",
    subject: "Accommodation for minors",
    message:
      "My child is 15 and travelling from Multan. What accommodation options do you arrange?",
    status: "open",
    replyBody: null,
    repliedAt: null,
    repliedBy: null,
    createdAt: DAYS_AGO(0),
  },
];

export const demoTeamProfiles: Profile[] = [
  {
    id: "profile-admin",
    email: "admin@meritmun.org",
    fullName: "Conference Admin",
    role: "admin",
    avatarUrl: null,
    createdAt: WEEK_AGO,
    updatedAt: NOW,
  },
  {
    id: "profile-eb",
    email: "eb@meritmun.org",
    fullName: "Executive Board Desk",
    role: "eb",
    avatarUrl: null,
    createdAt: WEEK_AGO,
    updatedAt: NOW,
  },
  {
    id: "profile-reviewer",
    email: "reviewer@meritmun.org",
    fullName: "Registrations Reviewer",
    role: "reviewer",
    avatarUrl: null,
    createdAt: WEEK_AGO,
    updatedAt: NOW,
  },
];

/* ── KPIs derived from sample rows ───────────────────────────────────────── */

function deriveOverviewKpis(): OverviewKpis {
  const totalDelegates = demoDelegates.length;
  const delegationCount = demoDelegations.length;
  const pendingPayments =
    demoDelegates.filter((d) => d.paymentStatus === "pending").length +
    demoDelegations.filter((d) => d.paymentStatus === "pending").length;
  const confirmedPayments =
    demoDelegates.filter((d) => d.paymentStatus === "confirmed").length +
    demoDelegations.filter((d) => d.paymentStatus === "confirmed").length;

  const totalAmount =
    demoDelegates
      .filter((d) => d.paymentStatus === "confirmed")
      .reduce((sum, d) => sum + (d.paymentAmount ?? 0), 0) +
    demoDelegations
      .filter((d) => d.paymentStatus === "confirmed")
      .reduce((sum, d) => sum + (d.paymentAmount ?? 0), 0);

  return {
    totalDelegates,
    totalRegistrations: totalDelegates + delegationCount,
    delegationCount,
    pendingPayments,
    confirmedPayments,
    totalAmount,
    openQueries: demoQueries.filter((q) => q.status === "open").length,
    allottedDraft: demoAllotments.filter((a) => a.status === "draft").length,
    allottedConfirmed: demoAllotments.filter((a) => a.status === "confirmed")
      .length,
  };
}

export const demoOverviewKpis: OverviewKpis = deriveOverviewKpis();
