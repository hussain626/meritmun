import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Server Supabase client for Server Components, Route Handlers, and server
 * actions. Uses the anon key + cookie session. Cookie writes may no-op in
 * Server Components; middleware refreshes the session.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookies are read-only here.
          // Middleware is responsible for refreshing the session cookie.
        }
      },
    },
  });
}

/**
 * Service-role client that bypasses RLS. Only use in trusted server code
 * after an application-level role check. Returns null when the key is absent.
 */
export function createServiceClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    return null;
  }

  return createSupabaseClient(getSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
