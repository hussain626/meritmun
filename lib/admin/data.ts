/**
 * Admin data access. Uses Supabase when configured; falls back to demo seed
 * when env is missing or a query fails (logged once per process).
 */

import {
  deriveDemoOverviewKpis,
  getDemoStore,
} from "@/lib/admin/demo-store";
import {
  DEFAULT_ALLOTMENT_RULES,
  mapAllotmentRules,
} from "@/lib/admin/allotment-rules";
import type {
  AllotmentRecord,
  AllotmentRules,
  AttendanceRecord,
  BankAccount,
  CommitteeAdminRecord,
  DelegateFilters,
  DelegateRecord,
  DelegationRecord,
  EbMemberRecord,
  HodRecord,
  MeritRunRecord,
  OverviewKpis,
  Portfolio,
  PricingSettings,
  Profile,
  QueryRecord,
  ScheduleDayRecord,
  ScheduleItemRecord,
  SecretariatMemberRecord,
  SponsorRecord,
} from "@/lib/admin/types";
import {
  toPublicAnnouncement,
  type AnnouncementSettings,
  type PublicAnnouncement,
} from "@/lib/admin/announcement";
import type { ConferenceSettings } from "@/lib/admin/conference";
import { scheduleDays as fallbackSchedule } from "@/content/schedule";
import { registrationOpen as fallbackRegistrationOpen } from "@/content/site";
import type { ScheduleDay } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

let didLogFallback = false;

function logFallbackOnce(context: string, error: unknown): void {
  if (didLogFallback) return;
  didLogFallback = true;
  console.warn(
    `[meritmun/admin] Supabase query failed (${context}); using demo data.`,
    error,
  );
}

async function withSupabase<T>(
  context: string,
  query: (
    client: Awaited<ReturnType<typeof createClient>>,
  ) => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!isSupabaseConfigured()) {
    return fallback;
  }

  try {
    const client = await createClient();
    return await query(client);
  } catch (error) {
    logFallbackOnce(context, error);
    return fallback;
  }
}

function mapPricing(row: Record<string, unknown>): PricingSettings {
  return {
    id: Number(row.id),
    currency: "PKR",
    delegateFee: Number(row.delegate_fee),
    delegationFee: Number(row.delegation_fee),
    perDelegateFee: Number(row.per_delegate_fee),
    delegationMin: Number(row.delegation_min),
    delegationMax: Number(row.delegation_max),
    earlyBirdEnabled: Boolean(row.early_bird_enabled),
    earlyBirdDelegateFee:
      row.early_bird_delegate_fee == null
        ? null
        : Number(row.early_bird_delegate_fee),
    earlyBirdPerDelegateFee:
      row.early_bird_per_delegate_fee == null
        ? null
        : Number(row.early_bird_per_delegate_fee),
    earlyBirdEndsAt:
      row.early_bird_ends_at == null ? null : String(row.early_bird_ends_at),
    updatedAt: String(row.updated_at),
    updatedBy: row.updated_by == null ? null : String(row.updated_by),
  };
}

function mapDelegate(row: Record<string, unknown>): DelegateRecord {
  return {
    id: String(row.id),
    reference: String(row.reference),
    delegateCode: String(row.delegate_code),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    institution: String(row.institution),
    age: row.age == null ? null : Number(row.age),
    city: String(row.city),
    experience: row.experience as DelegateRecord["experience"],
    priorAwards: row.prior_awards == null ? null : String(row.prior_awards),
    committeePrefs: Array.isArray(row.committee_prefs)
      ? (row.committee_prefs as string[])
      : [],
    accommodation: Boolean(row.accommodation),
    dietary: row.dietary == null ? null : String(row.dietary),
    hearAbout: row.hear_about as DelegateRecord["hearAbout"],
    paymentStatus: row.payment_status as DelegateRecord["paymentStatus"],
    paymentAmount:
      row.payment_amount == null ? null : Number(row.payment_amount),
    paymentConfirmedAt:
      row.payment_confirmed_at == null
        ? null
        : String(row.payment_confirmed_at),
    paymentRejectedAt:
      row.payment_rejected_at == null ? null : String(row.payment_rejected_at),
    rejectionReason:
      row.rejection_reason == null ? null : String(row.rejection_reason),
    delegationId: row.delegation_id == null ? null : String(row.delegation_id),
    isHeadDelegate: Boolean(row.is_head_delegate),
    feeType: row.fee_type as DelegateRecord["feeType"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDelegation(row: Record<string, unknown>): DelegationRecord {
  return {
    id: String(row.id),
    reference: String(row.reference),
    institutionName: String(row.institution_name),
    institutionCity: String(row.institution_city),
    institutionType: row.institution_type as DelegationRecord["institutionType"],
    headName: String(row.head_name),
    headEmail: String(row.head_email),
    headPhone: String(row.head_phone),
    headRole: String(row.head_role),
    delegationSize: Number(row.delegation_size),
    facultyAccompanying: Boolean(row.faculty_accompanying),
    committeeSpread: Array.isArray(row.committee_spread)
      ? (row.committee_spread as string[])
      : [],
    accommodationCount: Number(row.accommodation_count),
    notes: row.notes == null ? null : String(row.notes),
    paymentStatus: row.payment_status as DelegationRecord["paymentStatus"],
    paymentAmount:
      row.payment_amount == null ? null : Number(row.payment_amount),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function filterDelegates(
  rows: DelegateRecord[],
  filters?: DelegateFilters,
): DelegateRecord[] {
  if (!filters) return rows;

  return rows.filter((row) => {
    if (filters.paymentStatus && row.paymentStatus !== filters.paymentStatus) {
      return false;
    }
    if (filters.experience && row.experience !== filters.experience) {
      return false;
    }
    if (
      filters.institution &&
      !row.institution.toLowerCase().includes(filters.institution.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.preferredCommittee &&
      !row.committeePrefs.includes(filters.preferredCommittee)
    ) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [
        row.fullName,
        row.email,
        row.reference,
        row.delegateCode,
        row.institution,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export async function getOverviewKpis(): Promise<OverviewKpis> {
  return withSupabase(
    "getOverviewKpis",
    async (client) => {
      const [delegates, delegations, queries, allotments] = await Promise.all([
        client.from("delegates").select("payment_status, payment_amount"),
        client.from("delegations").select("payment_status, payment_amount"),
        client.from("queries").select("status"),
        client.from("allotments").select("status"),
      ]);

      if (delegates.error) throw delegates.error;
      if (delegations.error) throw delegations.error;
      if (queries.error) throw queries.error;
      if (allotments.error) throw allotments.error;

      const delegateRows = delegates.data ?? [];
      const delegationRows = delegations.data ?? [];
      const queryRows = queries.data ?? [];
      const allotmentRows = allotments.data ?? [];

      const totalDelegates = delegateRows.length;
      const delegationCount = delegationRows.length;

      const pendingPayments =
        delegateRows.filter((r) => r.payment_status === "pending").length +
        delegationRows.filter((r) => r.payment_status === "pending").length;

      const confirmedPayments =
        delegateRows.filter((r) => r.payment_status === "confirmed").length +
        delegationRows.filter((r) => r.payment_status === "confirmed").length;

      const totalAmount =
        delegateRows
          .filter((r) => r.payment_status === "confirmed")
          .reduce(
            (sum, r) => sum + (typeof r.payment_amount === "number" ? r.payment_amount : 0),
            0,
          ) +
        delegationRows
          .filter((r) => r.payment_status === "confirmed")
          .reduce(
            (sum, r) => sum + (typeof r.payment_amount === "number" ? r.payment_amount : 0),
            0,
          );

      return {
        totalDelegates,
        totalRegistrations: totalDelegates + delegationCount,
        delegationCount,
        pendingPayments,
        confirmedPayments,
        totalAmount,
        openQueries: queryRows.filter((r) => r.status === "open").length,
        allottedDraft: allotmentRows.filter((r) => r.status === "draft").length,
        allottedConfirmed: allotmentRows.filter((r) => r.status === "confirmed")
          .length,
      };
    },
    deriveDemoOverviewKpis(),
  );
}

export async function listDelegates(
  filters?: DelegateFilters,
): Promise<DelegateRecord[]> {
  return withSupabase(
    "listDelegates",
    async (client) => {
      let query = client.from("delegates").select("*").order("created_at", {
        ascending: false,
      });

      if (filters?.paymentStatus) {
        query = query.eq("payment_status", filters.paymentStatus);
      }
      if (filters?.experience) {
        query = query.eq("experience", filters.experience);
      }
      if (filters?.institution) {
        query = query.ilike("institution", `%${filters.institution}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data ?? []).map((row) =>
        mapDelegate(row as Record<string, unknown>),
      );
      return filterDelegates(mapped, {
        search: filters?.search,
        preferredCommittee: filters?.preferredCommittee,
      });
    },
    filterDelegates(getDemoStore().delegates, filters),
  );
}

export async function listDelegations(): Promise<DelegationRecord[]> {
  return withSupabase(
    "listDelegations",
    async (client) => {
      const { data, error } = await client
        .from("delegations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) =>
        mapDelegation(row as Record<string, unknown>),
      );
    },
    getDemoStore().delegations,
  );
}

export async function getPricing(): Promise<PricingSettings> {
  return withSupabase(
    "getPricing",
    async (client) => {
      const { data, error } = await client
        .from("pricing_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return getDemoStore().pricing;
      return mapPricing(data as Record<string, unknown>);
    },
    getDemoStore().pricing,
  );
}

function mapAnnouncement(row: Record<string, unknown>): AnnouncementSettings {
  const linkType = row.link_type;
  return {
    id: Number(row.id),
    isActive: Boolean(row.is_active),
    message: String(row.message ?? ""),
    linkType:
      linkType === "internal" || linkType === "external" ? linkType : "none",
    internalPath: row.internal_path == null ? null : String(row.internal_path),
    externalUrl: row.external_url == null ? null : String(row.external_url),
    updatedAt: String(row.updated_at),
    updatedBy: row.updated_by == null ? null : String(row.updated_by),
  };
}

export async function getAnnouncementSettings(): Promise<AnnouncementSettings> {
  return withSupabase(
    "getAnnouncementSettings",
    async (client) => {
      const { data, error } = await client
        .from("announcement_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return getDemoStore().announcement;
      return mapAnnouncement(data as Record<string, unknown>);
    },
    getDemoStore().announcement,
  );
}

export async function getPublicAnnouncement(): Promise<PublicAnnouncement | null> {
  if (!isSupabaseConfigured()) {
    return toPublicAnnouncement(getDemoStore().announcement);
  }

  try {
    const client = await createClient();
    const { data, error } = await client
      .from("announcement_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return toPublicAnnouncement(mapAnnouncement(data as Record<string, unknown>));
  } catch (error) {
    logFallbackOnce("getPublicAnnouncement", error);
    return toPublicAnnouncement(getDemoStore().announcement);
  }
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  return withSupabase(
    "listBankAccounts",
    async (client) => {
      const { data, error } = await client
        .from("bank_accounts")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          bankName: String(r.bank_name),
          accountTitle: String(r.account_title),
          accountNumber: String(r.account_number),
          iban: r.iban == null ? null : String(r.iban),
          branch: r.branch == null ? null : String(r.branch),
          instructions: r.instructions == null ? null : String(r.instructions),
          isActive: Boolean(r.is_active),
          sortOrder: Number(r.sort_order),
          createdAt: String(r.created_at),
        };
      });
    },
    getDemoStore().bankAccounts,
  );
}

export async function listQueries(): Promise<QueryRecord[]> {
  return withSupabase(
    "listQueries",
    async (client) => {
      const { data, error } = await client
        .from("queries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          name: String(r.name),
          email: String(r.email),
          topic: r.topic as QueryRecord["topic"],
          subject: String(r.subject),
          message: String(r.message),
          status: r.status as QueryRecord["status"],
          replyBody: r.reply_body == null ? null : String(r.reply_body),
          repliedAt: r.replied_at == null ? null : String(r.replied_at),
          repliedBy: r.replied_by == null ? null : String(r.replied_by),
          createdAt: String(r.created_at),
        };
      });
    },
    getDemoStore().queries,
  );
}

export async function listSponsors(): Promise<SponsorRecord[]> {
  return withSupabase(
    "listSponsors",
    async (client) => {
      const { data, error } = await client
        .from("sponsors")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          name: String(r.name),
          logoPath: r.logo_path == null ? null : String(r.logo_path),
          logoUrl: String(r.logo_url),
          url: String(r.url),
          sortOrder: Number(r.sort_order),
          isActive: Boolean(r.is_active),
        };
      });
    },
    getDemoStore().sponsors,
  );
}

export async function listEbMembers(): Promise<EbMemberRecord[]> {
  return withSupabase(
    "listEbMembers",
    async (client) => {
      const { data, error } = await client
        .from("eb_members")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          name: String(r.name),
          role: String(r.role),
          bio: String(r.bio),
          email: r.email == null ? null : String(r.email),
          photoPath: r.photo_path == null ? null : String(r.photo_path),
          photoUrl: r.photo_url == null ? null : String(r.photo_url),
          initials: String(r.initials),
          sortOrder: Number(r.sort_order),
          isPublished: Boolean(r.is_published),
        };
      });
    },
    getDemoStore().ebMembers,
  );
}

export async function listHods(): Promise<HodRecord[]> {
  return withSupabase(
    "listHods",
    async (client) => {
      const { data, error } = await client
        .from("hods")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          name: String(r.name),
          role: String(r.role),
          bio: String(r.bio),
          email: r.email == null ? null : String(r.email),
          photoPath: r.photo_path == null ? null : String(r.photo_path),
          photoUrl: r.photo_url == null ? null : String(r.photo_url),
          initials: String(r.initials),
          sortOrder: Number(r.sort_order),
          isPublished: Boolean(r.is_published),
        };
      });
    },
    getDemoStore().hods,
  );
}

export async function listSecretariat(): Promise<SecretariatMemberRecord[]> {
  return withSupabase(
    "listSecretariat",
    async (client) => {
      const { data, error } = await client
        .from("secretariat_members")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          committeeId: String(r.committee_id),
          name: String(r.name),
          role: String(r.role),
          initials: String(r.initials),
          sortOrder: Number(r.sort_order),
        };
      });
    },
    getDemoStore().secretariat,
  );
}

function mapCommittee(r: Record<string, unknown>): CommitteeAdminRecord {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    abbr: String(r.abbr),
    type: r.type as CommitteeAdminRecord["type"],
    difficulty: r.difficulty as CommitteeAdminRecord["difficulty"],
    hardnessScore: Number(r.hardness_score),
    agenda: String(r.agenda),
    overview: String(r.overview),
    focusPoints: Array.isArray(r.focus_points)
      ? (r.focus_points as string[])
      : [],
    seats: Number(r.seats),
    studyGuidePath:
      r.study_guide_path == null ? null : String(r.study_guide_path),
    studyGuideUrl:
      r.study_guide_url == null ? null : String(r.study_guide_url),
    featured: Boolean(r.featured),
    isPublished: Boolean(r.is_published),
    allotmentsPaused: Boolean(r.allotments_paused),
    sortOrder: Number(r.sort_order),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapPortfolio(r: Record<string, unknown>): Portfolio {
  return {
    id: String(r.id),
    committeeId: String(r.committee_id),
    countryName: String(r.country_name),
    isP5: Boolean(r.is_p5),
    hardness: Number(r.hardness),
    notes: r.notes == null ? null : String(r.notes),
    isActive: Boolean(r.is_active),
  };
}

function mapAllotment(r: Record<string, unknown>): AllotmentRecord {
  return {
    id: String(r.id),
    delegateId: String(r.delegate_id),
    committeeId: String(r.committee_id),
    portfolioId: String(r.portfolio_id),
    source: r.source as AllotmentRecord["source"],
    status: r.status as AllotmentRecord["status"],
    rationale: r.rationale == null ? null : String(r.rationale),
    score: r.score == null ? null : Number(r.score),
    confirmedAt: r.confirmed_at == null ? null : String(r.confirmed_at),
    confirmedBy: r.confirmed_by == null ? null : String(r.confirmed_by),
    emailSentAt: r.email_sent_at == null ? null : String(r.email_sent_at),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listCommitteesAdmin(): Promise<CommitteeAdminRecord[]> {
  return withSupabase(
    "listCommitteesAdmin",
    async (client) => {
      const { data, error } = await client
        .from("committees")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) =>
        mapCommittee(row as Record<string, unknown>),
      );
    },
    getDemoStore().committees,
  );
}

export async function listPortfolios(): Promise<Portfolio[]> {
  return withSupabase(
    "listPortfolios",
    async (client) => {
      const { data, error } = await client
        .from("portfolios")
        .select("*")
        .order("country_name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) =>
        mapPortfolio(row as Record<string, unknown>),
      );
    },
    getDemoStore().portfolios,
  );
}

export async function listAllotments(): Promise<AllotmentRecord[]> {
  return withSupabase(
    "listAllotments",
    async (client) => {
      const { data, error } = await client
        .from("allotments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) =>
        mapAllotment(row as Record<string, unknown>),
      );
    },
    getDemoStore().allotments,
  );
}

export type AllotmentState = {
  delegates: DelegateRecord[];
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
  allotments: AllotmentRecord[];
  rules: AllotmentRules;
};

/**
 * Strict snapshot for allotment writes. Unlike the list* readers this never
 * falls back to demo data — a failed read must abort the write, not seed the
 * database with demo rows.
 */
export async function loadAllotmentState(
  client: Awaited<ReturnType<typeof createClient>>,
): Promise<AllotmentState> {
  const [delegates, committees, portfolios, allotments, rules] =
    await Promise.all([
      client.from("delegates").select("*"),
      client.from("committees").select("*").order("sort_order"),
      client.from("portfolios").select("*"),
      client.from("allotments").select("*"),
      client.from("allotment_rules").select("*").eq("id", 1).maybeSingle(),
    ]);
  if (delegates.error) throw delegates.error;
  if (committees.error) throw committees.error;
  if (portfolios.error) throw portfolios.error;
  if (allotments.error) throw allotments.error;
  if (rules.error) throw rules.error;

  return {
    delegates: (delegates.data ?? []).map((r) =>
      mapDelegate(r as Record<string, unknown>),
    ),
    committees: (committees.data ?? []).map((r) =>
      mapCommittee(r as Record<string, unknown>),
    ),
    portfolios: (portfolios.data ?? []).map((r) =>
      mapPortfolio(r as Record<string, unknown>),
    ),
    allotments: (allotments.data ?? []).map((r) =>
      mapAllotment(r as Record<string, unknown>),
    ),
    rules: rules.data
      ? mapAllotmentRules(rules.data as Record<string, unknown>)
      : DEFAULT_ALLOTMENT_RULES,
  };
}

export async function listTeamProfiles(): Promise<Profile[]> {
  return withSupabase(
    "listTeamProfiles",
    async (client) => {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          email: String(r.email),
          fullName: String(r.full_name),
          role: r.role as Profile["role"],
          avatarUrl: r.avatar_url == null ? null : String(r.avatar_url),
          createdAt: String(r.created_at),
          updatedAt: String(r.updated_at),
        };
      });
    },
    getDemoStore().teamProfiles,
  );
}

function mapConference(row: Record<string, unknown>): ConferenceSettings {
  return {
    id: Number(row.id),
    registrationOpen: Boolean(row.registration_open),
    updatedAt: String(row.updated_at),
    updatedBy: row.updated_by == null ? null : String(row.updated_by),
  };
}

function mapScheduleItem(
  row: Record<string, unknown>,
): ScheduleItemRecord {
  return {
    id: String(row.id),
    dayId: String(row.day_id),
    start: String(row.start_time),
    end: String(row.end_time),
    title: String(row.title),
    kind: row.kind as ScheduleItemRecord["kind"],
    venue: String(row.venue ?? ""),
    description: row.description == null ? null : String(row.description),
    sortOrder: Number(row.sort_order),
  };
}

function mapScheduleDay(
  row: Record<string, unknown>,
  items: ScheduleItemRecord[],
): ScheduleDayRecord {
  return {
    id: String(row.id),
    date: row.date == null ? null : String(row.date),
    label: String(row.label),
    theme: String(row.theme ?? ""),
    sortOrder: Number(row.sort_order),
    items: items
      .filter((item) => item.dayId === String(row.id))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function getConferenceSettings(): Promise<ConferenceSettings> {
  return withSupabase(
    "getConferenceSettings",
    async (client) => {
      const { data, error } = await client
        .from("conference_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return getDemoStore().conference;
      return mapConference(data as Record<string, unknown>);
    },
    getDemoStore().conference,
  );
}

/** Public registration gate. Falls back to content/site.ts if unset. */
export async function getRegistrationOpen(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return getDemoStore().conference.registrationOpen;
  }

  try {
    const client = await createClient();
    const { data, error } = await client
      .from("conference_settings")
      .select("registration_open")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallbackRegistrationOpen;
    return Boolean(
      (data as Record<string, unknown>).registration_open,
    );
  } catch (error) {
    logFallbackOnce("getRegistrationOpen", error);
    return getDemoStore().conference.registrationOpen;
  }
}

export async function listScheduleDays(): Promise<ScheduleDayRecord[]> {
  return withSupabase(
    "listScheduleDays",
    async (client) => {
      const { data: days, error: daysError } = await client
        .from("schedule_days")
        .select("*")
        .order("sort_order", { ascending: true });
      if (daysError) throw daysError;
      const { data: items, error: itemsError } = await client
        .from("schedule_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (itemsError) throw itemsError;
      const mappedItems = (items ?? []).map((row) =>
        mapScheduleItem(row as Record<string, unknown>),
      );
      return (days ?? []).map((row) =>
        mapScheduleDay(row as Record<string, unknown>, mappedItems),
      );
    },
    getDemoStore().schedule,
  );
}

export async function getAllotmentRules(): Promise<AllotmentRules> {
  return withSupabase(
    "getAllotmentRules",
    async (client) => {
      const { data, error } = await client
        .from("allotment_rules")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_ALLOTMENT_RULES;
      return mapAllotmentRules(data as Record<string, unknown>);
    },
    getDemoStore().allotmentRules,
  );
}

export async function listAttendance(): Promise<AttendanceRecord[]> {
  return withSupabase(
    "listAttendance",
    async (client) => {
      const { data, error } = await client
        .from("delegate_attendance")
        .select("delegate_id, day_id, marked_at");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          delegateId: String(r.delegate_id),
          dayId: String(r.day_id),
          markedAt: String(r.marked_at),
        };
      });
    },
    getDemoStore().attendance,
  );
}

/** Latest merit-engine outcome per delegate, newest first. */
export async function listLatestMeritRuns(): Promise<MeritRunRecord[]> {
  const latest = (rows: MeritRunRecord[]) => {
    const seen = new Set<string>();
    return [...rows]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((row) => {
        if (seen.has(row.delegateId)) return false;
        seen.add(row.delegateId);
        return true;
      });
  };
  return withSupabase(
    "listLatestMeritRuns",
    async (client) => {
      const { data, error } = await client
        .from("merit_runs")
        .select("delegate_id, status, error, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return latest(
        (data ?? []).map((row) => {
          const r = row as Record<string, unknown>;
          return {
            delegateId: String(r.delegate_id),
            status: r.status as MeritRunRecord["status"],
            error: r.error == null ? null : String(r.error),
            createdAt: String(r.created_at),
          };
        }),
      );
    },
    latest(getDemoStore().meritRuns),
  );
}

export async function getPublicSchedule(): Promise<ScheduleDay[]> {
  const days = await listScheduleDays();
  if (days.length === 0) {
    return fallbackSchedule;
  }
  return days.map((day) => ({
    id: day.id,
    date: day.date,
    label: day.label,
    theme: day.theme,
    items: day.items.map((item) => ({
      id: item.id,
      start: item.start,
      end: item.end,
      title: item.title,
      kind: item.kind,
      venue: item.venue,
      description: item.description,
    })),
  }));
}
