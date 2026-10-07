/**
 * Team ownership. Only this account may remove team members — removing a
 * login is irreversible, so it is not delegated to every admin.
 */
export const TEAM_OWNER_EMAIL = "hussain@systemsummit.online";

export function isTeamOwner(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === TEAM_OWNER_EMAIL;
}
