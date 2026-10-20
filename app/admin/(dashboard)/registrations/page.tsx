import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { owedForDelegate, owedForDelegation } from "@/lib/admin/fees";
import {
  getConferenceSettings,
  getPricing,
  listCommitteesAdmin,
  listDelegates,
  listDelegations,
} from "@/lib/admin/data";
import { RegistrationsClient } from "./RegistrationsClient";

export const metadata: Metadata = {
  title: "Registrations",
  robots: { index: false, follow: false },
};

export default async function RegistrationsPage() {
  const session = await requireAdminSession();
  const [delegates, delegations, conference, committees, pricing] =
    await Promise.all([
      listDelegates(),
      listDelegations(),
      getConferenceSettings(),
      listCommitteesAdmin(),
      // Only prefills the confirm form; the page still works without it.
      getPricing().catch(() => null),
    ]);

  // What each registration owes, so the confirm form can prefill the amount.
  const owedById: Record<string, number> = {};
  for (const d of delegates) {
    owedById[d.id] = pricing ? owedForDelegate(d, pricing) : (d.quotedAmount ?? 0);
  }
  for (const g of delegations) {
    owedById[g.id] = pricing
      ? owedForDelegation(
          g,
          delegates.filter((d) => d.delegationId === g.id),
          pricing,
        )
      : (g.quotedAmount ?? 0);
  }

  return (
    <RegistrationsClient
      delegates={delegates}
      delegations={delegations}
      role={session.role}
      registrationOpen={conference.registrationOpen}
      committeeAbbr={Object.fromEntries(committees.map((c) => [c.slug, c.abbr]))}
      owedById={owedById}
    />
  );
}
