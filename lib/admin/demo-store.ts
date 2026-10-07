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

const store: DemoStore = {
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

export function getDemoStore(): DemoStore {
  return store;
}

export function deriveDemoOverviewKpis(): OverviewKpis {
  const { delegates, delegations, queries, allotments } = store;
  const totalDelegates = delegates.length;
  const delegationCount = delegations.length;
  const pendingPayments =
    delegates.filter((d) => d.paymentStatus === "pending").length +
    delegations.filter((d) => d.paymentStatus === "pending").length;
  const confirmedPayments =
    delegates.filter((d) => d.paymentStatus === "confirmed").length +
    delegations.filter((d) => d.paymentStatus === "confirmed").length;
  const totalAmount =
    delegates
      .filter((d) => d.paymentStatus === "confirmed")
      .reduce((sum, d) => sum + (d.paymentAmount ?? 0), 0) +
    delegations
      .filter((d) => d.paymentStatus === "confirmed")
      .reduce((sum, d) => sum + (d.paymentAmount ?? 0), 0);

  return {
    totalDelegates,
    totalRegistrations: totalDelegates + delegationCount,
    delegationCount,
    pendingPayments,
    confirmedPayments,
    totalAmount,
    openQueries: queries.filter((q) => q.status === "open").length,
    allottedDraft: allotments.filter((a) => a.status === "draft").length,
    allottedConfirmed: allotments.filter((a) => a.status === "confirmed")
      .length,
  };
}
