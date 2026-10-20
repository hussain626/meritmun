/**
 * Mutable in-memory clone of demo seed data so admin mutations feel live
 * when Supabase is not configured.
 */

import {
  demoAllotments,
  demoAnnouncement,
  demoBankAccounts,
  demoCommittees,
  demoConference,
  demoDelegates,
  demoDelegations,
  demoEbMembers,
  demoHods,
  demoPortfolios,
  demoPricing,
  demoQueries,
  demoSchedule,
  demoSecretariat,
  demoSponsors,
  demoTeamProfiles,
} from "@/lib/admin/demo-data";
import { DEFAULT_ALLOTMENT_RULES } from "@/lib/admin/allotment-rules";
import type { AnnouncementSettings } from "@/lib/admin/announcement";
import type { ConferenceSettings } from "@/lib/admin/conference";
import type {
  AllotmentRecord,
  AllotmentRules,
  AttendanceRecord,
  MeritRunRecord,
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

export type DemoStore = {
  delegates: DelegateRecord[];
  delegations: DelegationRecord[];
  allotments: AllotmentRecord[];
  allotmentRules: AllotmentRules;
  attendance: AttendanceRecord[];
  meritRuns: MeritRunRecord[];
  queries: QueryRecord[];
  pricing: PricingSettings;
  announcement: AnnouncementSettings;
  conference: ConferenceSettings;
  schedule: ScheduleDayRecord[];
  bankAccounts: BankAccount[];
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
  ebMembers: EbMemberRecord[];
  hods: HodRecord[];
  secretariat: SecretariatMemberRecord[];
  sponsors: SponsorRecord[];
  teamProfiles: Profile[];
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createStore(): DemoStore {
  return {
    delegates: clone(demoDelegates),
    delegations: clone(demoDelegations),
    allotments: clone(demoAllotments),
    allotmentRules: clone(DEFAULT_ALLOTMENT_RULES),
    attendance: [],
    meritRuns: [],
    queries: clone(demoQueries),
    pricing: clone(demoPricing),
    announcement: clone(demoAnnouncement),
    conference: clone(demoConference),
    schedule: clone(demoSchedule),
    bankAccounts: clone(demoBankAccounts),
    committees: clone(demoCommittees),
    portfolios: clone(demoPortfolios),
    ebMembers: clone(demoEbMembers),
    hods: clone(demoHods),
    secretariat: clone(demoSecretariat),
    sponsors: clone(demoSponsors),
    teamProfiles: clone(demoTeamProfiles),
  };
}

// Kept on globalThis so dev hot reloads and separately bundled route chunks
// share one store — otherwise a registration lands in a copy admin never reads.
const globalForDemo = globalThis as typeof globalThis & {
  __meritmunDemoStore?: DemoStore;
};
const store: DemoStore = (globalForDemo.__meritmunDemoStore ??= createStore());

export function getDemoStore(): DemoStore {
  return store;
}

type KpiPayment = { paymentStatus: string; paymentAmount: number | null };

/**
 * One payment per individual registration and one per delegation. Delegation
 * members are covered by their delegation's payment, so counting their rows
 * as well would double both the payment counts and the revenue.
 */
export function deriveOverviewKpis(
  delegates: (KpiPayment & { delegationId: string | null })[],
  delegations: KpiPayment[],
  queryStatuses: string[],
  allotmentStatuses: string[],
): OverviewKpis {
  const individuals = delegates.filter((d) => d.delegationId === null);
  const payments: KpiPayment[] = [...individuals, ...delegations];
  const confirmed = payments.filter((p) => p.paymentStatus === "confirmed");

  return {
    totalDelegates: delegates.length,
    totalRegistrations: payments.length,
    individualCount: individuals.length,
    delegationCount: delegations.length,
    pendingPayments: payments.filter((p) => p.paymentStatus === "pending").length,
    confirmedPayments: confirmed.length,
    totalAmount: confirmed.reduce((sum, p) => sum + (p.paymentAmount ?? 0), 0),
    openQueries: queryStatuses.filter((s) => s === "open").length,
    allottedDraft: allotmentStatuses.filter((s) => s === "draft").length,
    allottedConfirmed: allotmentStatuses.filter((s) => s === "confirmed").length,
  };
}

export function deriveDemoOverviewKpis(): OverviewKpis {
  return deriveOverviewKpis(
    store.delegates,
    store.delegations,
    store.queries.map((q) => q.status),
    store.allotments.map((a) => a.status),
  );
}
