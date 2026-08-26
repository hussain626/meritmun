"use client";

import { useMemo, useState, useTransition } from "react";
import { Filter } from "@/components/icons/Filter";
import { GripVertical } from "@/components/icons/GripVertical";
import { Plus } from "@/components/icons/Plus";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { Switch } from "@/components/admin/Switch";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { createSponsor, setSponsorActive } from "@/lib/admin/cms-actions";
import type { SponsorRecord } from "@/lib/admin/types";
import { initialsFromName } from "@/lib/utils";

type SponsorsClientProps = {
  sponsors: SponsorRecord[];
};

function tierLabel(index: number): { label: string; className: string } {
  if (index === 0) {
    return {
      label: "Title Sponsor",
      className: "bg-fg text-accent",
    };
  }
  if (index === 1) {
    return {
      label: "Gold Tier",
      className: "bg-accent/20 text-accent-fg",
    };
  }
  if (index === 2) {
    return {
      label: "Silver Tier",
      className: "bg-surface-inset text-fg-muted",
    };
  }
  return {
    label: "Partner",
    className: "bg-surface-inset text-fg-muted",
  };
}

export function SponsorsClient({ sponsors }: SponsorsClientProps) {
  const [activeOnly, setActiveOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const sorted = [...sponsors].sort((a, b) => a.sortOrder - b.sortOrder);
    return activeOnly ? sorted.filter((s) => s.isActive) : sorted;
  }, [sponsors, activeOnly]);

  const activeCount = sponsors.filter((s) => s.isActive).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sponsors Management"
        description="Drag and drop to reorder display hierarchy on the main site."
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
            {activeOnly ? "Show all" : "Filter"}
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
            Add Sponsor
          </Button>
        </div>
      </div>

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
                  Sort
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Logo
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Name & Tier
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  URL
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Status
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const tier = tierLabel(index);
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-3 text-fg-faint">
                      <GripVertical className="size-4" />
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
                      <span
                        className={`mt-1 inline-flex rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-semibold ${tier.className}`}
                      >
                        {tier.label}
                      </span>
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
                        onChange={(next) => {
                          startTransition(async () => {
                            await setSponsorActive(row.id, next);
                          });
                        }}
                      />
                    </td>
                    <td className="px-3 py-3" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add sponsor"
        footer={
          <Button
            type="submit"
            form="create-sponsor"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Adding"
          >
            Add sponsor
          </Button>
        }
      >
        <form
          id="create-sponsor"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await createSponsor({
                name: String(form.get("name") ?? ""),
                url: String(form.get("url") ?? ""),
                logoUrl: String(form.get("logoUrl") ?? ""),
              });
              setCreateStatus(result.message);
              if (result.ok) setCreateOpen(false);
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Name</span>
            <Input name="name" required placeholder="SystemSummit" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Website</span>
            <Input name="url" type="url" required placeholder="https://" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Logo URL</span>
            <Input name="logoUrl" type="url" placeholder="https://…/logo.png" />
          </label>
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
