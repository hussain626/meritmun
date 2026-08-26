"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { PortfolioManager } from "@/components/admin/PortfolioManager";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveCommitteeFields } from "@/lib/admin/actions";
import type {
  AdminRole,
  CommitteeAdminRecord,
  Portfolio,
} from "@/lib/admin/types";
import { titleCase } from "@/lib/utils";

type CommitteeDetailClientProps = {
  committee: CommitteeAdminRecord;
  portfolios: Portfolio[];
  role: AdminRole;
};

export function CommitteeDetailClient({
  committee,
  portfolios,
  role,
}: CommitteeDetailClientProps) {
  const canEdit = role === "admin" || role === "eb";
  const [form, setForm] = useState({
    name: committee.name,
    abbr: committee.abbr,
    agenda: committee.agenda,
    overview: committee.overview,
    seats: committee.seats,
    hardnessScore: committee.hardnessScore,
    featured: committee.featured,
    isPublished: committee.isPublished,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={committee.abbr}
        description={committee.name}
        actions={
          canEdit ? (
            <Button
              variant="primary"
              size="sm"
              loading={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await saveCommitteeFields(committee.id, form);
                  setMessage(result.message);
                });
              }}
            >
              Save committee
            </Button>
          ) : null
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-base font-bold text-fg">Details</h2>
          <div className="mt-4 grid gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Name
              </span>
              <Input
                value={form.name}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Abbreviation
              </span>
              <Input
                value={form.abbr}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, abbr: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                  Seats
                </span>
                <Input
                  type="number"
                  value={form.seats}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm({ ...form, seats: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                  Hardness
                </span>
                <Input
                  type="number"
                  value={form.hardnessScore}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hardnessScore: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Agenda
              </span>
              <Textarea
                rows={3}
                value={form.agenda}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Overview
              </span>
              <Textarea
                rows={5}
                value={form.overview}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, overview: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={form.featured}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                />
                Featured
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={form.isPublished}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm({ ...form, isPublished: e.target.checked })
                  }
                />
                Published
              </label>
            </div>
            <p className="text-xs text-fg-faint">
              {titleCase(committee.type)} · {titleCase(committee.difficulty)} ·
              slug {committee.slug}
            </p>
          </div>
        </section>

        <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
          <PortfolioManager
            committeeId={committee.id}
            seats={form.seats}
            portfolios={portfolios}
            canEdit={canEdit}
            defaultHardness={form.hardnessScore}
          />
        </section>
      </div>
    </div>
  );
}
