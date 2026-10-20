"use client";

import { useMemo, useState, useTransition } from "react";
import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { Download } from "@/components/icons/Download";
import { Plus } from "@/components/icons/Plus";
import { BoardMemberEditor } from "@/components/admin/BoardMemberEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { RowControls } from "@/components/admin/RowControls";
import { Switch } from "@/components/admin/Switch";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import {
  deleteBoardMember,
  deleteSecretariatMember,
  moveBoardMember,
  moveSecretariatMember,
  saveSecretariatMember,
  setBoardMemberPublished,
} from "@/lib/admin/cms-actions";
import type {
  HodRecord,
  SecretariatMemberRecord,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type SecretariatRow = SecretariatMemberRecord & { committeeAbbr: string };

type SecHodsClientProps = {
  secretariat: SecretariatRow[];
  hods: HodRecord[];
  committeeOptions: { id: string; abbr: string; name: string }[];
};

const AVATAR_TONES = [
  "bg-brand text-on-brand",
  "bg-accent text-on-accent",
  "bg-surface-inset text-fg-muted",
] as const;

type Deleting =
  | { kind: "secretariat"; id: string; name: string }
  | { kind: "hod"; id: string; name: string };

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function SecHodsClient({
  secretariat,
  hods,
  committeeOptions,
}: SecHodsClientProps) {
  const [tab, setTab] = useState("secretariat");
  const [roleFilter, setRoleFilter] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("");
  const [secEditorOpen, setSecEditorOpen] = useState(false);
  const [secEditing, setSecEditing] = useState<SecretariatRow | null>(null);
  const [secError, setSecError] = useState<string | null>(null);
  const [hodEditorOpen, setHodEditorOpen] = useState(false);
  const [hodEditing, setHodEditing] = useState<HodRecord | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const committeeOrder = useMemo(
    () => new Map(committeeOptions.map((c, i) => [c.id, i])),
    [committeeOptions],
  );

  // Grouped by committee, in each committee's public order.
  const orderedSec = useMemo(
    () =>
      [...secretariat].sort(
        (a, b) =>
          (committeeOrder.get(a.committeeId) ?? 0) -
            (committeeOrder.get(b.committeeId) ?? 0) ||
          a.sortOrder - b.sortOrder,
      ),
    [secretariat, committeeOrder],
  );
  const orderedHods = useMemo(
    () => [...hods].sort((a, b) => a.sortOrder - b.sortOrder),
    [hods],
  );

  const roles = useMemo(() => {
    const set = new Set(secretariat.map((s) => s.role));
    return [...set].sort();
  }, [secretariat]);

  const committeeAbbrs = useMemo(() => {
    const set = new Set(secretariat.map((s) => s.committeeAbbr));
    return [...set].sort();
  }, [secretariat]);

  const filteredSec = useMemo(() => {
    return orderedSec.filter((s) => {
      if (roleFilter && s.role !== roleFilter) return false;
      if (committeeFilter && s.committeeAbbr !== committeeFilter) return false;
      return true;
    });
  }, [orderedSec, roleFilter, committeeFilter]);

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
    });
  }

  function exportCsv() {
    const lines =
      tab === "secretariat"
        ? [
            "Name,Role,Committee",
            ...filteredSec.map((s) =>
              [s.name, s.role, s.committeeAbbr].map(csvCell).join(","),
            ),
          ]
        : [
            "Name,Role,Email,Status",
            ...orderedHods.map((h) =>
              [h.name, h.role, h.email ?? "", h.isPublished ? "Published" : "Hidden"]
                .map(csvCell)
                .join(","),
            ),
          ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      tab === "secretariat" ? "meritmun-secretariat.csv" : "meritmun-hods.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openAdd() {
    setMessage(null);
    if (tab === "hods") {
      setHodEditing(null);
      setHodEditorOpen(true);
    } else {
      setSecEditing(null);
      setSecError(null);
      setSecEditorOpen(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Management"
        description="Committee secretariat (shown on committee pages) and Heads of Departments (shown on the Executive Board page)."
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
              onClick={openAdd}
            >
              {tab === "hods" ? "Add HOD" : "Add Member"}
            </Button>
          </>
        }
      />

      {message ? (
        <p className="text-sm text-fg-muted" role="status">
          {message}
        </p>
      ) : null}

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
                      Committee
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSec.map((row, index) => {
                    const sameCommittee = orderedSec.filter(
                      (s) => s.committeeId === row.committeeId,
                    );
                    const position = sameCommittee.indexOf(row);
                    return (
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
                          <RowControls
                            label={row.name}
                            disabled={pending}
                            onEdit={() => {
                              setSecEditing(row);
                              setSecError(null);
                              setSecEditorOpen(true);
                            }}
                            onMoveUp={
                              position > 0
                                ? () => run(() => moveSecretariatMember(row.id, -1))
                                : undefined
                            }
                            onMoveDown={
                              position < sameCommittee.length - 1
                                ? () => run(() => moveSecretariatMember(row.id, 1))
                                : undefined
                            }
                            onDelete={() =>
                              setDeleting({ kind: "secretariat", id: row.id, name: row.name })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabPanel>
      ) : (
        <TabPanel idBase="sec-hods" tabId="hods">
          {orderedHods.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No HODs"
                body="Heads of Departments appear on the public Executive Board page."
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
                      Published
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderedHods.map((row, index) => (
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
                        <Switch
                          checked={row.isPublished}
                          label={`${row.name} published`}
                          disabled={pending}
                          onChange={(next) =>
                            run(() => setBoardMemberPublished("hod", row.id, next))
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <RowControls
                          label={row.name}
                          disabled={pending}
                          onEdit={() => {
                            setHodEditing(row);
                            setHodEditorOpen(true);
                          }}
                          onMoveUp={
                            index > 0
                              ? () => run(() => moveBoardMember("hod", row.id, -1))
                              : undefined
                          }
                          onMoveDown={
                            index < orderedHods.length - 1
                              ? () => run(() => moveBoardMember("hod", row.id, 1))
                              : undefined
                          }
                          onDelete={() =>
                            setDeleting({ kind: "hod", id: row.id, name: row.name })
                          }
                        />
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
        open={secEditorOpen}
        onClose={() => setSecEditorOpen(false)}
        title={secEditing ? `Edit ${secEditing.name}` : "Add secretariat member"}
        footer={
          <Button
            type="submit"
            form="sec-editor"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Saving"
          >
            {secEditing ? "Save changes" : "Add member"}
          </Button>
        }
      >
        <form
          id="sec-editor"
          key={secEditing?.id ?? "new"}
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setSecError(null);
            startTransition(async () => {
              const result = await saveSecretariatMember({
                id: secEditing?.id,
                name: String(form.get("name") ?? ""),
                role: String(form.get("role") ?? ""),
                committeeId: String(form.get("committeeId") ?? ""),
              });
              if (result.ok) {
                setMessage(result.message);
                setSecEditorOpen(false);
              } else {
                setSecError(result.message);
              }
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Name</span>
            <Input name="name" required defaultValue={secEditing?.name ?? ""} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Role</span>
            <Input
              name="role"
              required
              defaultValue={secEditing?.role ?? ""}
              placeholder="Chair"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Committee</span>
            <Select
              name="committeeId"
              required
              defaultValue={secEditing?.committeeId ?? committeeOptions[0]?.id}
              options={committeeOptions.map((c) => ({
                value: c.id,
                label: `${c.abbr} — ${c.name}`,
              }))}
            />
          </label>
          {secError ? (
            <p className="text-sm text-danger-fg" role="alert">
              {secError}
            </p>
          ) : null}
        </form>
      </Drawer>

      <BoardMemberEditor
        key={hodEditing?.id ?? "new-hod"}
        kind="hod"
        open={hodEditorOpen}
        member={hodEditing}
        onClose={() => setHodEditorOpen(false)}
        onSaved={(text) => {
          setMessage(text);
          setHodEditorOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;
          startTransition(async () => {
            const result =
              target.kind === "hod"
                ? await deleteBoardMember("hod", target.id)
                : await deleteSecretariatMember(target.id);
            setMessage(result.message);
            setDeleting(null);
          });
        }}
        title={`Remove ${deleting?.name ?? "this member"}?`}
        description={
          deleting?.kind === "hod"
            ? "They disappear from the public Executive Board page. To hide someone temporarily, switch Published off instead."
            : "They disappear from their committee's page."
        }
        confirmLabel="Remove"
        tone="danger"
        loading={pending}
      />
    </div>
  );
}
