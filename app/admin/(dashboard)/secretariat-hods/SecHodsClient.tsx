"use client";

import { useMemo, useState, useTransition } from "react";
import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { Download } from "@/components/icons/Download";
import { Pencil } from "@/components/icons/Pencil";
import { Plus } from "@/components/icons/Plus";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { createHod, createSecretariatMember } from "@/lib/admin/cms-actions";
import type {
  HodRecord,
  SecretariatMemberRecord,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type SecHodsClientProps = {
  secretariat: (SecretariatMemberRecord & { committeeAbbr: string })[];
  hods: HodRecord[];
  committeeOptions: { id: string; abbr: string; name: string }[];
};

const AVATAR_TONES = [
  "bg-brand text-on-brand",
  "bg-accent text-on-accent",
  "bg-surface-inset text-fg-muted",
] as const;

export function SecHodsClient({
  secretariat,
  hods,
  committeeOptions,
}: SecHodsClientProps) {
  const [tab, setTab] = useState("secretariat");
  const [roleFilter, setRoleFilter] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const roles = useMemo(() => {
    const set = new Set(secretariat.map((s) => s.role));
    return [...set].sort();
  }, [secretariat]);

  const committeeAbbrs = useMemo(() => {
    const set = new Set(secretariat.map((s) => s.committeeAbbr));
    return [...set].sort();
  }, [secretariat]);

  const filteredSec = useMemo(() => {
    return secretariat.filter((s) => {
      if (roleFilter && s.role !== roleFilter) return false;
      if (committeeFilter && s.committeeAbbr !== committeeFilter) return false;
      return true;
    });
  }, [secretariat, roleFilter, committeeFilter]);

  function exportCsv() {
    const rows =
      tab === "secretariat"
        ? filteredSec.map((s) => [s.name, s.role, s.committeeAbbr].join(","))
        : hods.map((h) => [h.name, h.role, h.isPublished ? "Active" : "Hidden"].join(","));
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "meritmun-management.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Management"
        description="Configure Secretariat members and Heads of Departments."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              iconStart={<Download className="size-4" />}
              onClick={exportCsv}
            >
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconStart={<Plus className="size-4" />}
              onClick={() => {
                setCreateStatus(null);
                setCreateOpen(true);
              }}
            >
              Add Member
            </Button>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: "secretariat", label: "Secretariat" },
          { id: "hods", label: "Heads of Departments (HODs)" },
        ]}
        value={tab}
        onChange={(id) => {
          setTab(id);
          setRoleFilter("");
          setCommitteeFilter("");
        }}
        label="Management sections"
        idBase="sec-hods"
        variant="underline"
      />

      {tab === "secretariat" ? (
        <TabPanel idBase="sec-hods" tabId="secretariat">
          <div className="mt-4 flex flex-wrap gap-2">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: "", label: "All Roles" },
                ...roles.map((r) => ({ value: r, label: r })),
              ]}
              className="min-h-9 w-40 text-sm"
            />
            <Select
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
              options={[
                { value: "", label: "All Committees" },
                ...committeeAbbrs.map((c) => ({ value: c, label: c })),
              ]}
              className="min-h-9 w-44 text-sm"
            />
          </div>

          {filteredSec.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No secretariat chairs"
                body="Chairs are linked to committees and shown on committee pages."
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead className="bg-surface-inset">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Name & Initials
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Role
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Linked Committee(s)
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
                  {filteredSec.map((row, index) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <InitialsMedallion
                            initials={row.initials}
                            size="sm"
                            className={cn(
                              "rounded-full",
                              AVATAR_TONES[index % AVATAR_TONES.length],
                            )}
                          />
                          <span className="font-semibold text-fg">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-fg">{row.role}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-sm bg-surface-inset px-2 py-0.5 text-xs font-medium text-fg-muted">
                          {row.committeeAbbr}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-fg">
                          <span className="size-1.5 rounded-full bg-success" />
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-fg-faint">
                          <Pencil className="size-4" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabPanel>
      ) : (
        <TabPanel idBase="sec-hods" tabId="hods">
          {hods.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No HODs"
                body="Heads of delegation appear on the public board page."
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead className="bg-surface-inset">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Name & Initials
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Role
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
                  {hods.map((row, index) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <InitialsMedallion
                            initials={row.initials}
                            size="sm"
                            className={cn(
                              "rounded-full",
                              AVATAR_TONES[index % AVATAR_TONES.length],
                            )}
                          />
                          <div>
                            <p className="font-semibold text-fg">{row.name}</p>
                            <p className="text-xs text-fg-faint">{row.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-fg">{row.role}</td>
                      <td className="px-4 py-3">
                        {row.isPublished ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-fg">
                            <span className="size-1.5 rounded-full bg-success" />
                            Active
                          </span>
                        ) : (
                          <Badge tone="neutral" size="sm">
                            Hidden
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-fg-faint">
                        <Pencil className="size-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabPanel>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={tab === "hods" ? "Add HOD" : "Add secretariat member"}
        footer={
          <Button
            type="submit"
            form="create-sec-hod"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Adding"
          >
            Add member
          </Button>
        }
      >
        <form
          id="create-sec-hod"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result =
                tab === "hods"
                  ? await createHod({
                      name: String(form.get("name") ?? ""),
                      role: String(form.get("role") ?? ""),
                      bio: String(form.get("bio") ?? ""),
                      email: String(form.get("email") ?? ""),
                    })
                  : await createSecretariatMember({
                      name: String(form.get("name") ?? ""),
                      role: String(form.get("role") ?? ""),
                      committeeId: String(form.get("committeeId") ?? ""),
                    });
              setCreateStatus(result.message);
              if (result.ok) setCreateOpen(false);
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Name</span>
            <Input name="name" required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Role</span>
            <Input
              name="role"
              required
              placeholder={tab === "hods" ? "Director of Logistics" : "Chair"}
            />
          </label>
          {tab === "secretariat" ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">Committee</span>
              <Select
                name="committeeId"
                required
                options={committeeOptions.map((c) => ({
                  value: c.id,
                  label: `${c.abbr} — ${c.name}`,
                }))}
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg">Email</span>
                <Input name="email" type="email" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg">Bio</span>
                <Textarea name="bio" rows={3} />
              </label>
            </>
          )}
          {createStatus ? (
            <p className="text-sm text-fg-muted" role="status">
              {createStatus}
            </p>
          ) : null}
        </form>
      </Drawer>
    </div>
  );
}
