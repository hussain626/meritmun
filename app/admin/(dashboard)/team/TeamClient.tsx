"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { Eye } from "@/components/icons/Eye";
import { EyeOff } from "@/components/icons/EyeOff";
import { MoreVertical } from "@/components/icons/MoreVertical";
import { UserPlus } from "@/components/icons/UserPlus";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createTeamMember, removeTeamMember } from "@/lib/admin/actions";
import { isTeamOwner, TEAM_OWNER_EMAIL } from "@/lib/admin/team";
import type { AdminRole, Profile } from "@/lib/admin/types";
import { formatAdminDate, initialsFromName, titleCase } from "@/lib/utils";

type TeamClientProps = {
  profiles: Profile[];
  role: AdminRole;
  currentUserId: string;
  /** Only the team owner may remove members. */
  canRemove: boolean;
};

/** Three-dots menu for one team row. Closes on outside click or Escape. */
function RowActions({
  member,
  disabledReason,
  onRemove,
}: {
  member: Profile;
  disabledReason: string | null;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={`Actions for ${member.fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-8 place-items-center rounded-sm text-fg-faint hover:bg-surface-inset hover:text-fg"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 rounded-sm border border-line bg-surface p-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            disabled={Boolean(disabledReason)}
            className="w-full rounded-sm px-3 py-2 text-left text-sm text-danger-fg hover:bg-surface-inset disabled:cursor-not-allowed disabled:text-fg-faint disabled:hover:bg-transparent"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
          >
            Remove member
          </button>
          {disabledReason ? (
            <p className="px-3 pb-2 text-xs text-fg-faint">{disabledReason}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const ROLE_TONE: Record<AdminRole, "neutral" | "accent"> = {
  admin: "neutral",
  eb: "accent",
  reviewer: "neutral",
};

const PAGE_SIZE = 8;

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <span className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="min-h-9 pr-11 text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

export function TeamClient({
  profiles,
  role,
  currentUserId,
  canRemove,
}: TeamClientProps) {
  const isAdmin = role === "admin";
  const [removing, setRemoving] = useState<Profile | null>(null);

  function removeBlockedReason(member: Profile): string | null {
    if (!canRemove) return `Only ${TEAM_OWNER_EMAIL} can remove members.`;
    if (member.id === currentUserId) return "You cannot remove yourself.";
    if (isTeamOwner(member.email)) return "The team owner cannot be removed.";
    return null;
  }
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [memberRole, setMemberRole] = useState<AdminRole>("reviewer");
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (roleFilter === "all") return profiles;
    return profiles.filter((p) => p.role === roleFilter);
  }, [profiles, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Team Management"
        description="Create admin logins and assign roles for the conference platform."
        actions={
          isAdmin ? (
            <Button
              variant="secondary"
              size="sm"
              iconStart={<UserPlus className="size-4" />}
              onClick={() => setFormOpen((v) => !v)}
            >
              Add member
            </Button>
          ) : undefined
        }
      />

      {message ? (
        <p
          role="status"
          className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-fg-muted"
        >
          {message}
        </p>
      ) : null}

      {isAdmin && formOpen ? (
        <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-fg">Create account</h2>
          <p className="mt-1 text-xs text-fg-faint">
            They can sign in at /admin/login immediately. No invite email is sent.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (password !== confirmPassword) {
                setMessage("Passwords do not match.");
                return;
              }
              startTransition(async () => {
                const result = await createTeamMember({
                  email,
                  role: memberRole,
                  fullName,
                  password,
                });
                setMessage(result.message);
                if (result.ok) {
                  setEmail("");
                  setFullName("");
                  setPassword("");
                  setConfirmPassword("");
                  setFormOpen(false);
                }
              });
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Full name</span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Name"
                required
                className="min-h-9 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@meritmun.org"
                autoComplete="off"
                required
                className="min-h-9 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Role</span>
              <Select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as AdminRole)}
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "eb", label: "EB" },
                  { value: "reviewer", label: "Reviewer" },
                ]}
                className="min-h-9 text-sm"
              />
            </label>
            <PasswordField
              id="team-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordField
              id="team-password-confirm"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            <div className="flex items-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                fullWidth
                loading={pending}
                loadingLabel="Creating"
              >
                Create account
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <FilterBar>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          Filter by Role:
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All Roles" },
              { value: "admin", label: "Admin" },
              { value: "eb", label: "EB" },
              { value: "reviewer", label: "Reviewer" },
            ]}
            className="min-h-9 w-40 text-sm"
          />
        </label>
      </FilterBar>

      {profiles.length === 0 ? (
        <EmptyState
          title="No team profiles"
          body="Create an admin or EB account with an email and password so they can sign in."
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Name
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Email
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Role
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Created
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <InitialsMedallion
                        initials={initialsFromName(row.fullName)}
                        size="sm"
                      />
                      <span className="font-semibold text-fg">{row.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{row.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={ROLE_TONE[row.role]} size="sm">
                      {titleCase(row.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {formatAdminDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-fg">
                      <span className="size-1.5 rounded-full bg-success" />
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      member={row}
                      disabledReason={removeBlockedReason(row)}
                      onRemove={() => setRemoving(row)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun="entries"
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          const id = removing.id;
          startTransition(async () => {
            const result = await removeTeamMember(id);
            setMessage(result.message);
            setRemoving(null);
          });
        }}
        title={`Remove ${removing?.fullName ?? "this member"}?`}
        description={`${removing?.email ?? "They"} will lose access to the admin panel immediately. Their login is deleted and cannot be restored — you would need to create a new account.`}
        confirmLabel="Remove member"
        tone="danger"
        loading={pending}
      />
    </div>
  );
}
