"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Download } from "@/components/icons/Download";
import { Mail } from "@/components/icons/Mail";
import { Play } from "@/components/icons/Play";
import { Search } from "@/components/icons/Search";
import { Settings } from "@/components/icons/Settings";
import {
  clearAllotment,
  issueAllotment,
  issueAllotments,
  runMeritEngineAction,
  saveManualAllotment,
} from "@/lib/admin/allotment-actions";
import type {
  AdminRole,
  AllotmentRecord,
  AllotmentRules,
  CommitteeAdminRecord,
  DelegateRecord,
  Portfolio,
} from "@/lib/admin/types";
import { cn, formatAdminDateTime, formatNumber } from "@/lib/utils";

export type AllotmentRow = {
  delegate: DelegateRecord;
  allotment: AllotmentRecord | null;
  delegationName: string | null;
  committeeLabel: string | null;
  countryName: string | null;
  isP5: boolean;
  /** Why the last merit run could not seat this delegate. */
  meritNote: string | null;
};

type StatusTab = "all" | "awaiting" | "draft" | "issued";

type AllotmentsClientProps = {
  rows: AllotmentRow[];
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
  takenPortfolios: { portfolioId: string; delegateId: string }[];
  rules: AllotmentRules;
  role: AdminRole;
  lastRunAt: string | null;
};

const PAGE_SIZE = 15;

const EXPERIENCE_LABEL: Record<string, string> = {
  "first-time": "First time",
  "1-3": "1–3 MUNs",
  "4-9": "4–9 MUNs",
  "10-plus": "10+ MUNs",
};

function rowStatus(row: AllotmentRow): Exclude<StatusTab, "all"> {
  if (!row.allotment) return "awaiting";
  return row.allotment.status === "confirmed" ? "issued" : "draft";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-line py-2 text-sm last:border-b-0">
      <dt className="text-fg-faint">{label}</dt>
      <dd className="text-fg">{value || "—"}</dd>
    </div>
  );
}

function StatusCell({ row }: { row: AllotmentRow }) {
  const status = rowStatus(row);
  const emailPending =
    row.allotment?.status === "confirmed" && !row.allotment.emailSentAt;
  const tone =
    status === "issued"
      ? emailPending
        ? "bg-warning"
        : "bg-success"
      : status === "draft"
        ? "bg-warning"
        : "bg-danger";
  const label =
    status === "issued"
      ? emailPending
        ? "Issued · email pending"
        : "Issued"
      : status === "draft"
        ? "Draft"
        : row.meritNote
          ? "Needs EB"
          : "Awaiting merit";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("size-1.5 rounded-full", tone)} />
      {label}
    </span>
  );
}

export function AllotmentsClient({
  rows,
  committees,
  portfolios,
  takenPortfolios,
  rules,
  role,
  lastRunAt,
}: AllotmentsClientProps) {
  const canMutate = role === "admin" || role === "eb";
  const [tab, setTab] = useState<StatusTab>("all");
  const [kind, setKind] = useState("");
  const [committeeFilter, setCommitteeFilter] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [keepDrafts, setKeepDrafts] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [selected, setSelected] = useState<AllotmentRow | null>(null);
  const [committeeId, setCommitteeId] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [rationale, setRationale] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const out = { all: rows.length, awaiting: 0, draft: 0, issued: 0, needsEb: 0, emailPending: 0 };
    for (const row of rows) {
      const status = rowStatus(row);
      out[status] += 1;
      if (status === "awaiting" && row.meritNote) out.needsEb += 1;
      if (row.allotment?.status === "confirmed" && !row.allotment.emailSentAt) {
        out.emailPending += 1;
      }
    }
    return out;
  }, [rows]);

  const toIssue = counts.draft + counts.emailPending;
  const paidTotal = rows.filter((r) => r.delegate.paymentStatus === "confirmed").length;
  const progress = paidTotal > 0 ? Math.round((counts.issued / paidTotal) * 100) : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (tab !== "all" && rowStatus(row) !== tab) return false;
      if (kind === "individual" && row.delegate.delegationId) return false;
      if (kind === "delegation" && !row.delegate.delegationId) return false;
      if (committeeFilter && row.allotment?.committeeId !== committeeFilter) return false;
      if (!q) return true;
      return [
        row.delegate.fullName,
        row.delegate.delegateCode,
        row.delegate.reference,
        row.delegate.institution,
        row.delegate.phone,
        row.countryName ?? "",
        row.delegationName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, tab, kind, committeeFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const heldBy = useMemo(
    () => new Map(takenPortfolios.map((t) => [t.portfolioId, t.delegateId])),
    [takenPortfolios],
  );

  const portfolioOptions = useMemo(() => {
    if (!committeeId || !selected) return [];
    return portfolios
      .filter((p) => p.committeeId === committeeId && p.isActive)
      .filter((p) => {
        const holder = heldBy.get(p.id);
        return !holder || holder === selected.delegate.id;
      })
      .map((p) => ({
        value: p.id,
        label: `${p.countryName} · hardness ${p.hardness}${p.isP5 ? " · P5" : ""}`,
      }));
  }, [portfolios, committeeId, selected, heldBy]);

  const selectedPortfolio = portfolios.find((p) => p.id === portfolioId);
  const selectedCommittee = committees.find((c) => c.id === committeeId);
  const committeeNameById = (id: string) =>
    committees.find((c) => c.id === id)?.abbr ?? "—";

  function openRow(row: AllotmentRow) {
    setSelected(row);
    setCommitteeId(
      row.allotment?.committeeId ??
        committees.find((c) => c.slug === row.delegate.committeePrefs[0])?.id ??
        "",
    );
    setPortfolioId(row.allotment?.portfolioId ?? "");
    setRationale(row.allotment?.source === "manual" ? (row.allotment.rationale ?? "") : "");
  }

  function run(task: () => Promise<{ ok: boolean; message: string }>, onOk?: () => void) {
    startTransition(async () => {
      const result = await task();
      setMessage(result.message);
      if (result.ok) onOk?.();
    });
  }

  function saveSeat(confirmChange = false) {
    if (!selected) return;
    run(
      () =>
        saveManualAllotment({
          delegateId: selected.delegate.id,
          committeeId,
          portfolioId,
          rationale,
          confirmChange,
        }),
      () => {
        setChangeOpen(false);
        setSelected(null);
      },
    );
  }

  function handleExport() {
    const header =
      "Delegate,Code,Phone,Email,Institution,Delegation,Committee,Country,Merit,Source,Status,Email sent";
    const lines = filtered.map((row) =>
      [
        row.delegate.fullName,
        row.delegate.delegateCode,
        row.delegate.phone,
        row.delegate.email,
        row.delegate.institution,
        row.delegationName ?? "",
        row.committeeLabel ?? "",
        row.countryName ?? "",
        row.allotment?.score == null ? "" : String(row.allotment.score),
        row.allotment?.source ?? "",
        rowStatus(row),
        row.allotment?.emailSentAt ? "yes" : "",
      ]
        .map((cell) => `"${cell.replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "meritmun-allotments.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const isIssued = selected?.allotment?.status === "confirmed";
  const seatChanged =
    selected?.allotment != null && selected.allotment.portfolioId !== portfolioId;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Allotments"
        description="Run the merit engine, review drafts, place delegates by hand, and issue seats."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              iconStart={<Download className="size-4" />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconStart={<Mail className="size-4" />}
              disabled={!canMutate || toIssue === 0 || pending}
              onClick={() => setIssueOpen(true)}
            >
              Issue allotments{toIssue > 0 ? ` (${toIssue})` : ""}
            </Button>
          </>
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

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-line bg-surface px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
              Merit engine
            </p>
            <p className="mt-1 text-sm text-fg">
              Last run: {lastRunAt ? formatAdminDateTime(lastRunAt) : "Not yet run"}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Awaiting {formatNumber(counts.awaiting)}
              {counts.needsEb > 0 ? (
                <span className="ml-3 text-danger-fg">
                  Needs EB {formatNumber(counts.needsEb)}
                </span>
              ) : null}
              <span className="ml-3">Drafts {formatNumber(counts.draft)}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral" size="sm">
                No P5 auto-seats
              </Badge>
              <Badge tone="neutral" size="sm">
                Top {rules.preferenceDepth} prefs
              </Badge>
              <Badge tone="neutral" size="sm">
                Advanced ≥ {rules.advancedMinScore}
              </Badge>
              <Badge tone="neutral" size="sm">
                Fallback: {rules.fallbackMode === "emptiest" ? "emptiest committee" : "EB places"}
              </Badge>
              {rules.delegationCommitteeCap > 0 ? (
                <Badge tone="neutral" size="sm">
                  ≤ {rules.delegationCommitteeCap} per delegation per committee
                </Badge>
              ) : null}
              {committees.some((c) => c.allotmentsPaused) ? (
                <Badge tone="warning" size="sm">
                  {committees.filter((c) => c.allotmentsPaused).length} paused
                </Badge>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/allotment-rules"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-fg hover:text-brand"
            >
              <Settings className="size-4" />
              Rules
            </Link>
            <Button
              variant="primary"
              size="sm"
              iconStart={<Play className="size-4" />}
              disabled={!canMutate || pending}
              onClick={() => setRunOpen(true)}
            >
              Run merit engine
            </Button>
          </div>
        </section>

        <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
          <p className="text-sm font-semibold text-fg">{progress}% Issued</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-inset">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            {formatNumber(counts.issued)}/{formatNumber(paidTotal)} paid delegates ·{" "}
            {formatNumber(counts.draft)} drafts
          </p>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: "all", label: `All (${counts.all})` },
            { id: "awaiting", label: `Awaiting (${counts.awaiting})` },
            { id: "draft", label: `Drafts (${counts.draft})` },
            { id: "issued", label: `Issued (${counts.issued})` },
          ]}
          value={tab}
          onChange={(id) => {
            setTab(id as StatusTab);
            setPage(1);
          }}
          label="Allotment status"
          idBase="allotments"
          variant="underline"
        />
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Name, code, phone, country"
              aria-label="Search allotments"
              className="min-h-9 w-56 pl-8 text-sm"
            />
          </div>
          <Select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
            aria-label="Registration type"
            options={[
              { value: "", label: "All delegates" },
              { value: "individual", label: "Individual" },
              { value: "delegation", label: "Delegation members" },
            ]}
            className="min-h-9 w-44 text-sm"
          />
          <Select
            value={committeeFilter}
            onChange={(e) => {
              setCommitteeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Committee"
            options={[
              { value: "", label: "All committees" },
              ...committees.map((c) => ({ value: c.id, label: c.abbr })),
            ]}
            className="min-h-9 w-40 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No paid delegates yet" : "Nothing matches"}
          body={
            rows.length === 0
              ? "Delegates appear here once their payment is confirmed in Registrations."
              : "Try another tab, filter, or search."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line">
                {["Delegate", "Committee", "Country", "Merit", "Type", "Status", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 py-2.5 text-xs font-semibold text-fg-muted"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => {
                const status = rowStatus(row);
                return (
                  <tr key={row.delegate.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-semibold text-fg hover:text-brand-fg"
                        onClick={() => openRow(row)}
                      >
                        {row.delegate.fullName}
                      </button>
                      <p className="text-xs text-fg-faint">
                        <span className="font-mono">{row.delegate.delegateCode}</span> ·{" "}
                        {row.delegationName ?? row.delegate.institution}
                      </p>
                      {row.meritNote ? (
                        <p className="mt-1 max-w-[28rem] text-xs text-danger-fg">
                          {row.meritNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{row.committeeLabel ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {row.countryName ?? "—"}
                        {row.isP5 ? (
                          <Badge tone="warning" size="sm">
                            P5
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg-muted">
                      {row.allotment?.score ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.allotment ? (
                        <Badge
                          tone={row.allotment.source === "manual" ? "accent" : "neutral"}
                          size="sm"
                        >
                          {row.allotment.source === "merit" ? "Merit" : "Manual"}
                        </Badge>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusCell row={row} />
                    </td>
                    <td className="px-4 py-3">
                      {canMutate ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => openRow(row)}
                          >
                            {status === "awaiting" ? "Set seat" : status === "draft" ? "Adjust" : "Change"}
                          </Button>
                          {status === "draft" ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              disabled={pending}
                              onClick={() => run(() => issueAllotment(row.allotment!.id))}
                            >
                              Issue
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-sm font-medium text-brand-fg hover:text-brand"
                          onClick={() => openRow(row)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun="delegates"
          />
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.delegate.fullName ?? "Allotment"}
        size="lg"
        footer={
          selected && canMutate ? (
            <>
              {selected.allotment?.status === "draft" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  className="text-danger-fg"
                  onClick={() => setClearOpen(true)}
                >
                  Clear draft
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                disabled={pending || !committeeId || !portfolioId}
                onClick={() => (isIssued && seatChanged ? setChangeOpen(true) : saveSeat())}
              >
                {isIssued ? "Change seat" : selected.allotment ? "Save seat" : "Place delegate"}
              </Button>
            </>
          ) : undefined
        }
      >
        {selected ? (
          <div className="flex flex-col gap-5">
            <dl>
              <DetailRow label="Code" value={selected.delegate.delegateCode} />
              <DetailRow label="Phone" value={selected.delegate.phone} />
              <DetailRow label="Email" value={selected.delegate.email} />
              <DetailRow
                label="Institution"
                value={
                  selected.delegationName
                    ? `${selected.delegationName} (delegation${selected.delegate.isHeadDelegate ? ", head" : ""})`
                    : selected.delegate.institution
                }
              />
              <DetailRow
                label="Experience"
                value={EXPERIENCE_LABEL[selected.delegate.experience] ?? selected.delegate.experience}
              />
              <DetailRow label="Awards" value={selected.delegate.priorAwards ?? "—"} />
              <DetailRow
                label="Preferences"
                value={selected.delegate.committeePrefs
                  .map((slug, i) => {
                    const c = committees.find((x) => x.slug === slug);
                    return c ? `${i + 1}. ${c.abbr}` : null;
                  })
                  .filter(Boolean)
                  .join("  ")}
              />
              {selected.allotment ? (
                <>
                  <DetailRow
                    label="Current seat"
                    value={`${committeeNameById(selected.allotment.committeeId)} · ${selected.countryName ?? "—"} (${selected.allotment.source}, ${selected.allotment.status})`}
                  />
                  <DetailRow label="Rationale" value={selected.allotment.rationale ?? "—"} />
                </>
              ) : selected.meritNote ? (
                <DetailRow label="Merit run" value={selected.meritNote} />
              ) : null}
            </dl>

            {selected.delegate.paymentStatus !== "confirmed" ? (
              <p className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-warning-fg">
                Payment is not confirmed — confirm it in Registrations before seating.
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Committee
              </span>
              <Select
                value={committeeId}
                onChange={(e) => {
                  setCommitteeId(e.target.value);
                  setPortfolioId("");
                }}
                disabled={!canMutate}
                placeholder="Choose a committee"
                options={committees.map((c) => ({
                  value: c.id,
                  label: `${c.abbr}${c.allotmentsPaused ? " (paused)" : ""}`,
                }))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Country
              </span>
              <Select
                value={portfolioId}
                onChange={(e) => setPortfolioId(e.target.value)}
                disabled={!canMutate || !committeeId}
                options={portfolioOptions}
                placeholder={
                  committeeId && portfolioOptions.length === 0
                    ? "No free countries in this committee"
                    : "Choose a country"
                }
              />
              <span className="text-xs text-fg-faint">
                Only free countries are listed. Manual seats are locked from merit re-runs.
              </span>
            </label>
            {selectedPortfolio?.isP5 ? (
              <p className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-warning-fg">
                P5 seat — never auto-allotted. You are assigning it as an EB manual seat.
              </p>
            ) : null}
            {selectedCommittee?.allotmentsPaused ? (
              <p className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-fg-muted">
                {selectedCommittee.abbr} is paused for the merit engine; manual placement still works.
              </p>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                EB note
              </span>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                disabled={!canMutate}
                placeholder="Why this seat (optional)"
              />
            </label>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={runOpen}
        onClose={() => setRunOpen(false)}
        onConfirm={() =>
          run(() => runMeritEngineAction({ keepDrafts }), () => setRunOpen(false))
        }
        title="Run the merit engine?"
        description={
          <div className="flex flex-col gap-3">
            <p>
              Scores every paid delegate without a locked seat and places them by merit,
              preferences, and the allotment rules. Issued and manual seats are never touched.
            </p>
            <Checkbox
              label="Keep existing merit drafts"
              description="Only seat delegates who have no draft yet. Leave off to re-plan all drafts."
              checked={keepDrafts}
              onChange={(e) => setKeepDrafts(e.target.checked)}
            />
          </div>
        }
        confirmLabel="Run engine"
        loading={pending}
      />

      <ConfirmDialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onConfirm={() =>
          run(
            () => issueAllotments(committeeFilter || undefined),
            () => setIssueOpen(false),
          )
        }
        title="Issue allotments?"
        description={`Confirms ${counts.draft} draft${counts.draft === 1 ? "" : "s"}${counts.emailPending ? ` and retries ${counts.emailPending} failed email${counts.emailPending === 1 ? "" : "s"}` : ""}${committeeFilter ? ` in ${committeeNameById(committeeFilter)}` : ""}, emailing each delegate their committee and country.`}
        confirmLabel="Issue & email"
        loading={pending}
      />

      <ConfirmDialog
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        onConfirm={() => saveSeat(true)}
        title="Change an issued allotment?"
        description={`${selected?.delegate.fullName ?? "This delegate"} already received their allotment. They will be emailed the new seat (${selectedCommittee?.abbr ?? ""} · ${selectedPortfolio?.countryName ?? ""}) and the old one is freed.`}
        confirmLabel="Change & email"
        tone="danger"
        loading={pending}
      />

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          const id = selected?.allotment?.id;
          if (!id) return;
          run(() => clearAllotment(id), () => {
            setClearOpen(false);
            setSelected(null);
          });
        }}
        title="Clear this draft?"
        description="Frees the seat. The delegate goes back to Awaiting and the next merit run can place them again."
        confirmLabel="Clear draft"
        tone="danger"
        loading={pending}
      />
    </div>
  );
}
