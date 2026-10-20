"use client";

import { useMemo, useState, useTransition } from "react";
import { Filter } from "@/components/icons/Filter";
import { Plus } from "@/components/icons/Plus";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { RowControls } from "@/components/admin/RowControls";
import { Switch } from "@/components/admin/Switch";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import {
  deleteSponsor,
  moveSponsor,
  saveSponsor,
  setSponsorActive,
} from "@/lib/admin/cms-actions";
import type { SponsorRecord } from "@/lib/admin/types";
import { initialsFromName } from "@/lib/utils";

type SponsorsClientProps = {
  sponsors: SponsorRecord[];
};

export function SponsorsClient({ sponsors }: SponsorsClientProps) {
  const [activeOnly, setActiveOnly] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SponsorRecord | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SponsorRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ordered = useMemo(
    () => [...sponsors].sort((a, b) => a.sortOrder - b.sortOrder),
    [sponsors],
  );
  const rows = activeOnly ? ordered.filter((s) => s.isActive) : ordered;
  const activeCount = sponsors.filter((s) => s.isActive).length;

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
    });
  }

  function openEditor(sponsor: SponsorRecord | null) {
    setEditing(sponsor);
    setEditorError(null);
    setEditorOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sponsors Management"
        description="Active sponsors appear in the homepage slider in this order. Use the arrows to reorder."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-fg">
          Active Sponsors ({activeCount})
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconStart={<Filter className="size-4" />}
            onClick={() => setActiveOnly((v) => !v)}
          >
            {activeOnly ? "Show all" : "Active only"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconStart={<Plus className="size-4" />}
            onClick={() => openEditor(null)}
          >
            Add Sponsor
          </Button>
        </div>
      </div>

      {message ? (
        <p className="text-sm text-fg-muted" role="status">
          {message}
        </p>
      ) : null}

      {sponsors.length === 0 ? (
        <EmptyState
          title="No sponsors"
          body="Add active sponsor logos to populate the public slider."
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line">
                <th className="w-12 px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Logo
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Name
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  URL
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Active
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const position = ordered.indexOf(row);
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-3 tabular-nums text-fg-faint">
                      {position + 1}
                    </td>
                    <td className="px-3 py-3">
                      {row.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.logoUrl}
                          alt=""
                          className="size-10 rounded-sm border border-line object-contain"
                        />
                      ) : (
                        <span className="grid size-10 place-items-center rounded-sm bg-surface-inset text-xs font-bold text-fg-muted">
                          {initialsFromName(row.name)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-fg">{row.name}</p>
                    </td>
                    <td className="px-3 py-3">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-fg-muted hover:text-brand-fg"
                      >
                        {row.url}
                      </a>
                    </td>
                    <td className="px-3 py-3">
                      <Switch
                        checked={row.isActive}
                        label={`${row.name} active`}
                        disabled={pending}
                        onChange={(next) => run(() => setSponsorActive(row.id, next))}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <RowControls
                        label={row.name}
                        disabled={pending}
                        onEdit={() => openEditor(row)}
                        onMoveUp={
                          position > 0 ? () => run(() => moveSponsor(row.id, -1)) : undefined
                        }
                        onMoveDown={
                          position < ordered.length - 1
                            ? () => run(() => moveSponsor(row.id, 1))
                            : undefined
                        }
                        onDelete={() => setDeleting(row)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add sponsor"}
        footer={
          <Button
            type="submit"
            form="sponsor-editor"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Saving"
          >
            {editing ? "Save changes" : "Add sponsor"}
          </Button>
        }
      >
        <form
          id="sponsor-editor"
          key={editing?.id ?? "new"}
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setEditorError(null);
            startTransition(async () => {
              const result = await saveSponsor({
                id: editing?.id,
                name: String(form.get("name") ?? ""),
                url: String(form.get("url") ?? ""),
                logoUrl: String(form.get("logoUrl") ?? ""),
              });
              if (result.ok) {
                setMessage(result.message);
                setEditorOpen(false);
              } else {
                setEditorError(result.message);
              }
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Name</span>
            <Input
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              placeholder="SystemSummit"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Website</span>
            <Input
              name="url"
              type="url"
              required
              defaultValue={editing?.url ?? ""}
              placeholder="https://"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Logo link</span>
            <Input
              name="logoUrl"
              defaultValue={editing?.logoUrl ?? ""}
              placeholder="https://…/logo.png"
            />
            <span className="text-xs text-fg-faint">
              Optional. Without a logo the slider shows the sponsor&apos;s name.
            </span>
          </label>
          {editorError ? (
            <p className="text-sm text-danger-fg" role="alert">
              {editorError}
            </p>
          ) : null}
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const id = deleting.id;
          startTransition(async () => {
            const result = await deleteSponsor(id);
            setMessage(result.message);
            setDeleting(null);
          });
        }}
        title={`Remove ${deleting?.name ?? "this sponsor"}?`}
        description="It leaves the homepage slider. To hide it temporarily, switch Active off instead."
        confirmLabel="Remove"
        tone="danger"
        loading={pending}
      />
    </div>
  );
}
