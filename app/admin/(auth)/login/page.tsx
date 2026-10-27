import type { Metadata } from "next";
import Link from "next/link";
import { LoginShowcase } from "@/components/admin/LoginShowcase";
import { SystemSummitCredit } from "@/components/admin/SystemSummitCredit";
import { Wordmark } from "@/components/layout/Wordmark";
import { signOutAdmin } from "@/lib/admin/actions";
import { getAdminSession } from "@/lib/admin/auth";
import { Button, ButtonLink } from "@/components/ui/Button";
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
  // Sent here for lacking a role while already signed in: explain that
  // instead of showing a sign-in form that would only loop back.
  const signedIn =
    configured && params.reason === "forbidden" ? await getAdminSession() : null;

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
            {signedIn ? (
              <div className="flex flex-col gap-4">
                <p className="rounded-sm border border-line bg-surface-inset px-3 py-2.5 text-sm text-fg-muted">
                  You are signed in as {signedIn.user.email} ({signedIn.role}).
                  That page needs a different role, ask an admin if you
                  should have access.
                </p>
                <ButtonLink href="/admin" variant="primary" size="lg" fullWidth>
                  Back to the admin panel
                </ButtonLink>
                <form action={signOutAdmin}>
                  <Button type="submit" variant="outline" size="lg" fullWidth>
                    Sign in with another account
                  </Button>
                </form>
              </div>
            ) : (
              <LoginForm
                configured={configured}
                nextPath={safeAdminNext(params.next)}
                reason={params.reason}
              />
            )}
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
