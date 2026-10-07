"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Switch } from "@/components/admin/Switch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Check } from "@/components/icons/Check";
import { Shield } from "@/components/icons/Shield";
import {
  saveAllotmentRules,
  setCommitteeAllotmentsPaused,
} from "@/lib/admin/allotment-actions";
import { FIXED_ALLOTMENT_RULES } from "@/lib/admin/allotment-rules";
import type {
  AdminRole,
  AllotmentFallbackMode,
  AllotmentRules,
  CommitteeAdminRecord,
} from "@/lib/admin/types";
import { cn, formatAdminDateTime, titleCase } from "@/lib/utils";

export type PoolHealthRow = {
  committee: CommitteeAdminRecord;
  activeCountries: number;
  p5Countries: number;
  taken: number;
  /** Active, non-P5, unheld countries the engine can still hand out. */
  freeForEngine: number;
};

type AllotmentRulesClientProps = {
  rules: AllotmentRules;
  pool: PoolHealthRow[];
  role: AdminRole;
};

function RuleField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
        {label}
      </span>
      {children}
      <span className="text-xs text-fg-muted">{hint}</span>
    </label>
  );
}

function ToggleRule({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-sm border border-line bg-surface-inset px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>
      </div>
      <Switch
        checked={checked}
        label={label}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

export function AllotmentRulesClient({
  rules,
  pool,
  role,
}: AllotmentRulesClientProps) {
  const canMutate = role === "admin" || role === "eb";
  const [form, setForm] = useState(rules);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch<K extends keyof AllotmentRules>(key: K, value: AllotmentRules[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await saveAllotmentRules(form);
      setMessage(result.message);
    });
  }

  function togglePause(committeeId: string, paused: boolean) {
    startTransition(async () => {
      const result = await setCommitteeAllotmentsPaused(committeeId, paused);
      setMessage(result.message);
    });
  }

  const totals = pool.reduce(
    (sum, row) => ({
      seats: sum.seats + row.committee.seats,
      active: sum.active + row.activeCountries,
      free: sum.free + row.freeForEngine,
    }),
    { seats: 0, active: 0, free: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Allotment Rules"
        description="How the merit engine seats delegates, and the state of every committee's country pool."
        actions={
          <Button
            variant="primary"
            size="sm"
            iconStart={<Check className="size-4" />}
            disabled={!canMutate}
            loading={pending}
            onClick={save}
          >
            Save rules
          </Button>
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-fg">Engine settings</h2>
          <p className="mt-1 text-xs text-fg-muted">
            {new Date(rules.updatedAt).getTime() > 0
              ? `Last saved ${formatAdminDateTime(rules.updatedAt)}.`
              : "Using the default rules."}{" "}
            Changes apply from the next run — existing drafts stay until you re-run.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <RuleField
              label="Advanced committee minimum"
              hint="Merit score (0–100) needed for the engine to seat someone in an advanced committee."
            >
              <Input
                type="number"
                min={0}
                max={100}
                value={form.advancedMinScore}
                disabled={!canMutate}
                onChange={(e) => patch("advancedMinScore", e.target.valueAsNumber)}
              />
            </RuleField>
            <RuleField
              label="Intermediate committee minimum"
              hint="Same gate for intermediate committees. 0 = open to everyone."
            >
              <Input
                type="number"
                min={0}
                max={100}
                value={form.intermediateMinScore}
                disabled={!canMutate}
                onChange={(e) => patch("intermediateMinScore", e.target.valueAsNumber)}
              />
            </RuleField>
            <RuleField
              label="Preferences honoured"
              hint="How many of each delegate's ranked committees the engine tries, in order."
            >
              <Select
                value={String(form.preferenceDepth)}
                disabled={!canMutate}
                onChange={(e) => patch("preferenceDepth", Number(e.target.value))}
                options={[
                  { value: "1", label: "First choice only" },
                  { value: "2", label: "Top two" },
                  { value: "3", label: "All three" },
                ]}
              />
            </RuleField>
            <RuleField
              label="When preferences are full"
              hint="Fallback when none of a delegate's preferences has an eligible open seat."
            >
              <Select
                value={form.fallbackMode}
                disabled={!canMutate}
                onChange={(e) =>
                  patch("fallbackMode", e.target.value as AllotmentFallbackMode)
                }
                options={[
                  { value: "emptiest", label: "Place in the emptiest eligible committee" },
                  { value: "none", label: "Leave for EB to place by hand" },
                ]}
              />
            </RuleField>
            <RuleField
              label="Delegation cap per committee"
              hint="Max members of one delegation the engine puts in the same committee. 0 = no cap."
            >
              <Input
                type="number"
                min={0}
                max={50}
                value={form.delegationCommitteeCap}
                disabled={!canMutate}
                onChange={(e) =>
                  patch("delegationCommitteeCap", e.target.valueAsNumber)
                }
              />
            </RuleField>
          </div>

          <div className="mt-4 grid gap-2">
            <ToggleRule
              label="Match country hardness to merit"
              hint="Strong delegates get the hardest countries in their committee; newcomers get gentler ones. Off = alphabetical."
              checked={form.matchHardness}
              disabled={!canMutate}
              onChange={(next) => patch("matchHardness", next)}
            />
          </div>
        </section>

        <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Shield className="size-4 text-fg-faint" />
            Always enforced
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {FIXED_ALLOTMENT_RULES.map((rule) => (
              <li key={rule} className="flex gap-2 text-sm text-fg-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-success-fg" />
                {rule}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-sm border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-fg">Country pool</h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {totals.active} active countries for {totals.seats} published seats ·{" "}
              {totals.free} still free for the engine. Edit a pool from its committee page.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line">
                {["Committee", "Difficulty", "Gate", "Countries", "Held", "Free (engine)", "Engine", ""].map(
                  (heading) => (
                    <th key={heading} className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {pool.map((row) => {
                const gate =
                  row.committee.difficulty === "advanced"
                    ? form.advancedMinScore
                    : row.committee.difficulty === "intermediate"
                      ? form.intermediateMinScore
                      : 0;
                const short = row.activeCountries < row.committee.seats;
                return (
                  <tr key={row.committee.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-fg">{row.committee.abbr}</p>
                      <p className="text-xs text-fg-faint">{row.committee.name}</p>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {titleCase(row.committee.difficulty)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">
                      {gate > 0 ? `≥ ${gate}` : "Open"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("tabular-nums", short ? "text-warning-fg" : "text-fg")}>
                        {row.activeCountries}/{row.committee.seats}
                      </span>
                      {row.p5Countries > 0 ? (
                        <Badge tone="warning" size="sm" className="ml-2">
                          {row.p5Countries} P5
                        </Badge>
                      ) : null}
                      {row.activeCountries === 0 ? (
                        <p className="text-xs text-danger-fg">Empty pool — engine skips it</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">{row.taken}</td>
                    <td className="px-4 py-3 tabular-nums text-fg">{row.freeForEngine}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <Switch
                          checked={!row.committee.allotmentsPaused}
                          label={`Merit engine fills ${row.committee.abbr}`}
                          disabled={!canMutate || pending}
                          onChange={(on) => togglePause(row.committee.id, !on)}
                        />
                        <span className="text-xs text-fg-muted">
                          {row.committee.allotmentsPaused ? "Paused" : "On"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/committees/${row.committee.id}`}
                        className="text-sm font-medium text-brand-fg hover:text-brand"
                      >
                        Edit pool
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
