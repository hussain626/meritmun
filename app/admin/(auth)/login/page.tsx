import type { Metadata } from "next";
import Link from "next/link";
import { LoginShowcase } from "@/components/admin/LoginShowcase";
import { SystemSummitCredit } from "@/components/admin/SystemSummitCredit";
import { Wordmark } from "@/components/layout/Wordmark";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

function safeAdminNext(value: string | undefined): string {
  if (!value) return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value === "/admin/login" || value.startsWith("/admin/login?")) {
    return "/admin";
  }
  return value;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <div className="grid min-h-dvh bg-canvas lg:h-dvh lg:grid-cols-[minmax(22rem,38%)_1fr] lg:overflow-hidden">
      <section className="flex min-h-dvh flex-col px-8 py-10 sm:px-12 lg:h-dvh lg:px-14">
        <div className="shrink-0">
          <Wordmark />
        </div>

        <div className="flex w-full max-w-[22rem] flex-1 flex-col justify-center py-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Welcome back. Enter your credentials to continue.
          </p>
          <div className="mt-8">
            <LoginForm
              configured={configured}
              nextPath={safeAdminNext(params.next)}
              reason={params.reason}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 text-xs text-fg-faint">
          <p>
            © {new Date().getFullYear()} MERITMUN
            <span className="mx-2 text-line-strong">·</span>
            <Link
              href="/"
              className="hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            >
              Public site
            </Link>
          </p>
          <SystemSummitCredit className="text-fg-faint lg:hidden" />
        </div>
      </section>

      <LoginShowcase />
    </div>
  );
}
