/**
 * Public-site readers for everything the admin panel manages. The admin
 * list* readers already handle demo mode and query failures; this layer
 * filters to what visitors may see (published / active) and maps rows into
 * the public domain types the site components render.
 */

import {
  getPricing,
  listCommitteesAdmin,
  listEbMembers,
  listHods,
  listSecretariat,
  listSponsors,
} from "@/lib/admin/data";
import type {
  CommitteeAdminRecord,
  EbMemberRecord,
  HodRecord,
  SecretariatMemberRecord,
} from "@/lib/admin/types";
import { buildFaqs } from "@/content/faq";
import type { BoardMember, Committee, FaqEntry } from "@/lib/types";

/* ── Committees ──────────────────────────────────────────────────────────── */

function toPublicCommittee(
  committee: CommitteeAdminRecord,
  secretariat: SecretariatMemberRecord[],
): Committee {
  return {
    slug: committee.slug,
    name: committee.name,
    abbr: committee.abbr,
    type: committee.type,
    difficulty: committee.difficulty,
    agenda: committee.agenda,
    overview: committee.overview,
    focusPoints: committee.focusPoints,
    seats: committee.seats,
    chairs: secretariat
      .filter((member) => member.committeeId === committee.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((member) => ({
        name: member.name,
        role: member.role,
        initials: member.initials,
      })),
    backgroundGuideUrl: committee.studyGuideUrl,
    featured: committee.featured,
    doubleDelegate: committee.isDoubleDelegate,
  };
}

/** Published committees in admin sort order, with their chairs. */
export async function listPublicCommittees(): Promise<Committee[]> {
  const [committees, secretariat] = await Promise.all([
    listCommitteesAdmin(),
    listSecretariat(),
  ]);
  return committees
    .filter((c) => c.isPublished)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => toPublicCommittee(c, secretariat));
}

export async function getPublicCommittee(
  slug: string,
): Promise<Committee | undefined> {
  const committees = await listPublicCommittees();
  return committees.find((c) => c.slug === slug);
}

/* ── EB / HODs ───────────────────────────────────────────────────────────── */

function toBoardMember(
  member: EbMemberRecord | HodRecord,
  tier: BoardMember["tier"],
): BoardMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    tier,
    bio: member.bio,
    initials: member.initials,
    email: member.email,
    photoUrl: member.photoUrl,
  };
}

export async function listPublicBoard(): Promise<{
  secretariat: BoardMember[];
  directorate: BoardMember[];
}> {
  const [eb, hods] = await Promise.all([listEbMembers(), listHods()]);
  const published = <T extends { isPublished: boolean; sortOrder: number }>(
    rows: T[],
  ) => rows.filter((r) => r.isPublished).sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    secretariat: published(eb).map((m) => toBoardMember(m, "secretariat")),
    directorate: published(hods).map((m) => toBoardMember(m, "directorate")),
  };
}

/* ── Sponsors ────────────────────────────────────────────────────────────── */

export type PublicSponsorCard = {
  id: string;
  name: string;
  logoUrl: string;
  url: string;
};

export async function listPublicSponsors(): Promise<PublicSponsorCard[]> {
  const sponsors = await listSponsors();
  return sponsors
    .filter((s) => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({ id: s.id, name: s.name, logoUrl: s.logoUrl, url: s.url }));
}

/* ── Pricing ─────────────────────────────────────────────────────────────── */

export type PublicPricing = {
  currency: string;
  /** Fee for one individual delegate, early-bird applied. */
  delegate: number;
  /** Individual fee without social, early-bird applied. */
  delegateNoSocial: number;
  /** Per-head fee for delegation members, early-bird applied. */
  perDelegate: number;
  /** Per-head fee without social, early-bird applied. */
  perDelegateNoSocial: number;
  /** Flat fee charged once per delegation, on top of the per-head fees. */
  delegationFlat: number;
  /** Numbers registrants send their transfer screenshot to. */
  paymentContacts: string[];
  minDelegation: number;
  maxDelegation: number;
  /** Set only while an early-bird fee is actually being applied. */
  earlyBird: { endsAt: string | null } | null;
  /** Fee type to stamp on a new individual / delegation-member row. */
  delegateFeeType: "delegate" | "early_bird_delegate";
  memberFeeType: "delegation_member" | "early_bird_delegation_member";
};

function earlyBirdActive(enabled: boolean, endsAt: string | null): boolean {
  if (!enabled) return false;
  if (!endsAt) return true;
  return Date.now() <= new Date(endsAt).getTime();
}

/** Fees exactly as set on /admin/pricing, the same numbers Finance confirms. */
export async function getPublicPricing(): Promise<PublicPricing> {
  const pricing = await getPricing();
  const window = earlyBirdActive(
    pricing.earlyBirdEnabled,
    pricing.earlyBirdEndsAt,
  );
  // Early bird applies per fee only when that fee was actually filled in, so
  // a row is never tagged early-bird while being quoted the standard fee.
  const delegateEarly = window && pricing.earlyBirdDelegateFee != null;
  const memberEarly = window && pricing.earlyBirdPerDelegateFee != null;
  return {
    currency: pricing.currency,
    delegate: delegateEarly
      ? (pricing.earlyBirdDelegateFee as number)
      : pricing.delegateFee,
    delegateNoSocial: delegateEarly
      ? (pricing.earlyBirdDelegateFeeNoSocial ?? pricing.delegateFeeNoSocial)
      : pricing.delegateFeeNoSocial,
    perDelegate: memberEarly
      ? (pricing.earlyBirdPerDelegateFee as number)
      : pricing.perDelegateFee,
    perDelegateNoSocial: memberEarly
      ? (pricing.earlyBirdPerDelegateFeeNoSocial ?? pricing.perDelegateFeeNoSocial)
      : pricing.perDelegateFeeNoSocial,
    delegationFlat: pricing.delegationFee,
    paymentContacts: pricing.paymentContacts,
    minDelegation: pricing.delegationMin,
    maxDelegation: pricing.delegationMax,
    earlyBird:
      delegateEarly || memberEarly ? { endsAt: pricing.earlyBirdEndsAt } : null,
    delegateFeeType: delegateEarly ? "early_bird_delegate" : "delegate",
    memberFeeType: memberEarly
      ? "early_bird_delegation_member"
      : "delegation_member",
  };
}

/** One delegate's fee for their social choice. */
export function individualFee(pricing: PublicPricing, withSocial: boolean): number {
  return withSocial ? pricing.delegate : pricing.delegateNoSocial;
}

export function memberFee(pricing: PublicPricing, withSocial: boolean): number {
  return withSocial ? pricing.perDelegate : pricing.perDelegateNoSocial;
}

/** Whole-delegation quote: each member's fee for their social choice, plus the flat fee. */
export function delegationQuote(
  pricing: PublicPricing,
  members: readonly { withSocial: boolean }[],
): number {
  return (
    members.reduce((sum, m) => sum + memberFee(pricing, m.withSocial), 0) +
    pricing.delegationFlat
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────────── */

/** FAQ answers quote the same fees as /admin/pricing; the rest is static. */
export async function getPublicFaqs(): Promise<FaqEntry[]> {
  const pricing = await getPublicPricing().catch(() => null);
  return buildFaqs(pricing);
}
