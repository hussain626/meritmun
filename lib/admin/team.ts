import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Team ownership. Only this account may remove team members, removing a
 * login is irreversible, so it is not delegated to every admin.
 */
export const TEAM_OWNER_EMAIL = "hussain@systemsummit.online";

export function isTeamOwner(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === TEAM_OWNER_EMAIL;
}

/**
 * Whether this signed-in user may remove team members. In demo mode the demo
 * admin stands in for the owner so the flow can be exercised end to end.
 */
export function canRemoveTeamMembers(email: string | null | undefined): boolean {
  return isTeamOwner(email) || !isSupabaseConfigured();
}
