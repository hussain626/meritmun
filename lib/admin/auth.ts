import { redirect } from "next/navigation";
import { getRegistrationOpen } from "@/lib/admin/data";
import type { AdminRole } from "@/lib/admin/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  role: AdminRole;
};

export type AdminSessionFailure =
  | "unauthenticated"
  | "no_profile"
  | "forbidden";

const DEMO_SESSION: AdminSession = {
  user: {
    id: "demo-admin",
    email: "admin@meritmun.org",
    fullName: "Demo Admin",
  },
  role: "admin",
};

type SessionLookup =
  | { session: AdminSession; error?: undefined }
  | { session: null; error: AdminSessionFailure };

async function lookupAdminSession(): Promise<SessionLookup> {
  if (!isSupabaseConfigured()) {
    return { session: DEMO_SESSION };
  }

  try {
    const client = await createClient();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return { session: null, error: "unauthenticated" };
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("[meritmun/admin] profile lookup", profileError.message);
      return { session: null, error: "no_profile" };
    }

    if (!profile) {
      return { session: null, error: "no_profile" };
    }

    const role = profile.role as AdminRole;
    if (role !== "admin" && role !== "eb" && role !== "reviewer") {
      return { session: null, error: "forbidden" };
    }

    return {
      session: {
        user: {
          id: user.id,
          email: String(profile.email ?? user.email ?? ""),
          fullName: String(profile.full_name ?? user.email ?? "Admin"),
        },
        role,
      },
    };
  } catch (error) {
    console.warn("[meritmun/admin] session lookup", error);
    return { session: null, error: "unauthenticated" };
  }
}

/**
 * Resolve the current admin session. When Supabase is configured, loads the
 * auth user + `profiles.role`. Otherwise returns a demo admin so the UI works
 * offline.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const result = await lookupAdminSession();
  return result.session;
}

function loginRedirect(
  reason?: Exclude<AdminSessionFailure, "unauthenticated">,
): never {
  if (reason === "no_profile") {
    redirect("/admin/login?reason=profile");
  }
  if (reason === "forbidden") {
    redirect("/admin/login?reason=forbidden");
  }
  redirect("/admin/login");
}

/**
 * Role gate for server actions. Server actions are public POST endpoints, so
 * every mutation checks the caller here instead of trusting RLS alone (RLS
 * makes a blocked UPDATE match zero rows without an error).
 */
export async function authorizeAction(
  allowedRoles: AdminRole[],
  action = "make this change",
): Promise<
  { ok: true; session: AdminSession } | { ok: false; message: string }
> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, message: "Your session has expired. Sign in again." };
  }
  if (!allowedRoles.includes(session.role)) {
    return { ok: false, message: `Your role cannot ${action}.` };
  }
  return { ok: true, session };
}

/**
 * Registration gate with the staff exception: while public registration is
 * closed, admins and the EB can still register someone by hand when they come
 * in through the admin "Manual registration" link (`?manual=1`).
 */
export async function canAcceptRegistration(manual: boolean): Promise<boolean> {
  if (await getRegistrationOpen()) return true;
  if (!manual) return false;
  const session = await getAdminSession();
  return session !== null && (session.role === "admin" || session.role === "eb");
}

/**
 * Require a session (and optionally one of `allowedRoles`). Redirects to
 * `/admin/login` when missing or unauthorized.
 */
export async function requireAdminSession(
  allowedRoles?: AdminRole[],
): Promise<AdminSession> {
  const result = await lookupAdminSession();
  if (!result.session) {
    loginRedirect(
      result.error === "unauthenticated" ? undefined : result.error,
    );
  }
  if (allowedRoles && !allowedRoles.includes(result.session.role)) {
    loginRedirect("forbidden");
  }
  return result.session;
}
