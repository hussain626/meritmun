import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Browser Supabase client (Client Components). Relies on cookie storage via
 * `@supabase/ssr`. Throws if public env vars are missing — call
 * `isSupabaseConfigured()` first when demo fallback is acceptable.
 */
export function createBrowserClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createSupabaseBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
