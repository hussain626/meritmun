import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { listTeamProfiles } from "@/lib/admin/data";
import { canRemoveTeamMembers } from "@/lib/admin/team";
import { TeamClient } from "./TeamClient";

export const metadata: Metadata = {
  title: "Team",
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  const session = await requireAdminSession(["admin"]);
  const profiles = await listTeamProfiles();

  return (
    <TeamClient
      profiles={profiles}
      role={session.role}
      currentUserId={session.user.id}
      canRemove={canRemoveTeamMembers(session.user.email)}
    />
  );
}
