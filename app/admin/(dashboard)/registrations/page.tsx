import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getConferenceSettings,
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
  const [delegates, delegations, conference, committees] = await Promise.all([
    listDelegates(),
    listDelegations(),
    getConferenceSettings(),
    listCommitteesAdmin(),
  ]);

  return (
    <RegistrationsClient
      delegates={delegates}
      delegations={delegations}
      role={session.role}
      registrationOpen={conference.registrationOpen}
      committeeAbbr={Object.fromEntries(committees.map((c) => [c.slug, c.abbr]))}
    />
  );
}
