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
import type { BoardMember, Committee } from "@/lib/types";

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
  /** Per-head fee for delegation members, early-bird applied. */
  perDelegate: number;
  minDelegation: number;
  maxDelegation: number;
  earlyBird: { endsAt: string | null } | null;
};

function earlyBirdActive(enabled: boolean, endsAt: string | null): boolean {
  if (!enabled) return false;
  if (!endsAt) return true;
  return Date.now() <= new Date(endsAt).getTime();
}

/** Fees exactly as set on /admin/pricing — the same numbers Finance confirms. */
export async function getPublicPricing(): Promise<PublicPricing> {
  const pricing = await getPricing();
  const early = earlyBirdActive(pricing.earlyBirdEnabled, pricing.earlyBirdEndsAt);
  return {
    currency: pricing.currency,
    delegate:
      early && pricing.earlyBirdDelegateFee != null
        ? pricing.earlyBirdDelegateFee
        : pricing.delegateFee,
    perDelegate:
      early && pricing.earlyBirdPerDelegateFee != null
        ? pricing.earlyBirdPerDelegateFee
        : pricing.perDelegateFee,
    minDelegation: pricing.delegationMin,
    maxDelegation: pricing.delegationMax,
    earlyBird: early ? { endsAt: pricing.earlyBirdEndsAt } : null,
  };
}
