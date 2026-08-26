import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getConferenceSettings, listDelegates, listDelegations } from "@/lib/admin/data";
import { RegistrationsClient } from "./RegistrationsClient";

export const metadata: Metadata = {
  title: "Registrations",
  robots: { index: false, follow: false },
};

export default async function RegistrationsPage() {
  const session = await requireAdminSession();
  const [delegates, delegations, conference] = await Promise.all([
    listDelegates(),
    listDelegations(),
    getConferenceSettings(),
  ]);

  return (
    <RegistrationsClient
      delegates={delegates}
      delegations={delegations}
      role={session.role}
      registrationOpen={conference.registrationOpen}
    />
  );
}
