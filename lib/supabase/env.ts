/**
 * Env helpers for Supabase. Public vars must be present for any client.
 * Newer projects issue a publishable key (`sb_publishable_…`); older ones
 * use the JWT anon key. Either value is accepted.
 */

const PROJECT_HOST = /^[a-z0-9-]+\.supabase\.co$/i;

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function readPublicSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

/**
 * Normalize Netlify/UI paste mistakes (quotes, missing https://) and reject
 * values that would crash `@supabase/supabase-js` in middleware.
 */
export function getSupabaseUrl(): string {
  let value = stripWrappingQuotes(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  );
  if (PROJECT_HOST.test(value)) {
    value = `https://${value}`;
  }
  if (!/^https?:\/\//i.test(value)) {
    return "";
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "";
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseUrl().length > 0 && readPublicSupabaseKey().length > 0;
}

export function getSupabaseAnonKey(): string {
  return readPublicSupabaseKey();
}
