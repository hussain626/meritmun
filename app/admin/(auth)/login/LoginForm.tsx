"use client";

import { useActionState, useState } from "react";
import { signInAdmin, type SignInState } from "@/lib/admin/actions";
import { Eye } from "@/components/icons/Eye";
import { EyeOff } from "@/components/icons/EyeOff";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const REASON_MESSAGES: Record<string, string> = {
  profile:
    "Signed in, but this account has no admin profile yet. Run migration 001, insert a public.profiles row with role admin, then try again.",
  forbidden: "This account is not allowed to use the admin panel.",
};

export function LoginForm({
  configured,
  nextPath = "/admin",
  reason,
}: {
  configured: boolean;
  nextPath?: string;
  reason?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInAdmin,
    null,
  );
  const message = state?.message ?? (reason ? REASON_MESSAGES[reason] : null);

  if (!configured) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-sm border border-line bg-surface-inset px-3 py-2.5 text-sm text-fg-muted">
          Supabase is not configured. Running in demo mode with a full admin
          session — changes stay in memory for this process.
        </p>
        <ButtonLink href="/admin" variant="primary" size="lg" fullWidth>
          Demo mode — continue
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">Email</span>
        <Input
          type="email"
          name="email"
          autoComplete="username"
          required
          placeholder="you@meritmun.org"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">Password</span>
        <span className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </span>
      </label>
      {message ? (
        <p
          role="alert"
          className="rounded-sm border border-danger bg-surface-inset px-3 py-2 text-sm text-danger-fg"
        >
          {message}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={pending}
        loadingLabel="Signing in"
      >
        Sign in
      </Button>
    </form>
  );
}
