"use client";

import { useMemo, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Close } from "@/components/icons/Close";
import { Download } from "@/components/icons/Download";
import { Play } from "@/components/icons/Play";
import { Plus } from "@/components/icons/Plus";
import {
  confirmAllotment,
  updateAllotmentDraft,
} from "@/lib/admin/actions";
import type {
  AdminRole,
  AllotmentRecord,
  CommitteeAdminRecord,
  Portfolio,
} from "@/lib/admin/types";
import { cn, formatAdminDateTime, formatNumber } from "@/lib/utils";

export type AllotmentRow = AllotmentRecord & {
  delegateName: string;
  committeeName: string;
  countryName: string;
  isP5: boolean;
  inDelegation: boolean;
};

type AllotmentsClientProps = {
  rows: AllotmentRow[];
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
  role: AdminRole;
  lastRunAt: string | null;
  failureCount: number;
  totalSlots: number;
};

const PAGE_SIZE = 10;

export function AllotmentsClient({
  rows,
  committees,
  portfolios,
  role,
  lastRunAt,
  failureCount,
  totalSlots,
}: AllotmentsClientProps) {
  const canMutate = role === "admin" || role === "eb";
  const [tab, setTab] = useState<"delegates" | "delegations">("delegates");
  const [committeeFilter, setCommitteeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AllotmentRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [committeeId, setCommitteeId] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [rationale, setRationale] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmed = rows.filter((r) => r.status === "confirmed").length;
  const drafts = rows.filter((r) => r.status === "draft").length;
  const progress = totalSlots > 0 ? Math.round((confirmed / totalSlots) * 100) : 0;

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (tab === "delegations" && !row.inDelegation) return false;
      if (committeeFilter && row.committeeId !== committeeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      return true;
    });
  }, [rows, tab, committeeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const portfolioOptions = useMemo(() => {
    const cid = committeeId || selected?.committeeId;
    return portfolios
      .filter((p) => p.committeeId === cid && p.isActive)
      .map((p) => ({
        value: p.id,
        label: `${p.countryName}${p.isP5 ? " (P5)" : ""}`,
      }));
  }, [portfolios, committeeId, selected]);

  function openRow(row: AllotmentRow) {
    setSelected(row);
    setCommitteeId(row.committeeId);
    setPortfolioId(row.portfolioId);
    setRationale(row.rationale ?? "");
  }

  const selectedPortfolio = portfolios.find((p) => p.id === portfolioId);

  function handleExport() {
    const header = "Delegate,Committee,Country,Source,Status,P5";
    const lines = filtered.map((row) =>
      [
        row.delegateName,
        row.committeeName,
        row.countryName,
        row.source,
        row.status,
        row.isP5 ? "P5" : "",
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Allotments"
        description="Manage delegate and delegation committee assignments."
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
              iconStart={<Plus className="size-4" />}
              disabled={!canMutate || drafts === 0}
              onClick={() => {
                const draft = rows.find((r) => r.status === "draft");
                if (draft) openRow(draft);
              }}
            >
              Manual Allotment
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
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-surface px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
              Merit algorithm
            </p>
            <p className="mt-1 text-sm text-fg">
              Last Run:{" "}
              {lastRunAt ? formatAdminDateTime(lastRunAt) : "Not yet run"}
              <Badge tone="success" size="sm" className="ml-2">
                Success
              </Badge>
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Allotted: {formatNumber(confirmed)}
              {failureCount > 0 ? (
                <span className="ml-3 text-danger-fg">
                  Failures: {formatNumber(failureCount)}
                </span>
              ) : (
                <span className="ml-3">Failures: 0</span>
              )}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            iconStart={<Play className="size-4" />}
            disabled
            title="Merit re-runs automatically when a payment is confirmed."
          >
            Re-run Merit
          </Button>
        </section>

        <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
          <p className="text-sm font-semibold text-fg">
            {progress}% Confirmed
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-inset">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            {formatNumber(confirmed)}/{formatNumber(totalSlots || rows.length)}{" "}
            Slots · {formatNumber(drafts)} Drafts
          </p>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: "delegates", label: "Delegates" },
            { id: "delegations", label: "Delegations" },
          ]}
          value={tab}
          onChange={(id) => {
            setTab(id as "delegates" | "delegations");
            setPage(1);
          }}
          label="Allotment lists"
          idBase="allotments"
          variant="underline"
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={committeeFilter}
            onChange={(e) => {
              setCommitteeFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Committees" },
              ...committees.map((c) => ({ value: c.id, label: c.abbr })),
            ]}
            className="min-h-9 w-44 text-sm"
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Status" },
              { value: "draft", label: "Draft" },
              { value: "confirmed", label: "Confirmed" },
            ]}
            className="min-h-9 w-36 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No allotments yet"
          body="Confirm a payment to queue merit drafts, or assign seats manually."
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
                  Committee
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Country
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Type
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-fg">
                    {row.delegateName}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{row.committeeName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      {row.countryName}
                      {row.isP5 ? (
                        <Badge tone="warning" size="sm">
                          P5
                        </Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={row.source === "manual" ? "accent" : "neutral"}
                      size="sm"
                    >
                      {row.source === "merit" ? "Merit" : "Manual"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          row.status === "confirmed"
                            ? "bg-success"
                            : "bg-warning",
                        )}
                      />
                      {row.status === "confirmed" ? "Confirmed" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "draft" && canMutate ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${row.delegateName}`}
                          className="grid size-8 place-items-center rounded-sm text-danger-fg hover:bg-surface-inset"
                          onClick={() => openRow(row)}
                        >
                          <Close className="size-4" />
                        </button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            setSelected(row);
                            setConfirmOpen(true);
                          }}
                        >
                          Confirm
                        </Button>
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

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.delegateName ?? "Allotment"}
        size="lg"
        footer={
          selected && canMutate ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || selected.status === "confirmed"}
                onClick={() => {
                  startTransition(async () => {
                    const result = await updateAllotmentDraft(selected.id, {
                      committeeId,
                      portfolioId,
                      rationale,
                    });
                    setMessage(result.message);
                    if (result.ok) setSelected(null);
                  });
                }}
              >
                Save draft
              </Button>
              {selected.status === "draft" ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirmOpen(true)}
                >
                  Confirm allotment
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      >
        {selected ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-fg-muted">
              Status:{" "}
              <StatusBadge kind="allotment" status={selected.status} /> · Source:{" "}
              {selected.source}
            </p>
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
                disabled={!canMutate || selected.status === "confirmed"}
                options={committees.map((c) => ({
                  value: c.id,
                  label: c.abbr,
                }))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Portfolio
              </span>
              <Select
                value={portfolioId}
                onChange={(e) => setPortfolioId(e.target.value)}
                disabled={!canMutate || selected.status === "confirmed"}
                options={portfolioOptions}
                placeholder="Select country"
              />
            </label>
            {selectedPortfolio?.isP5 ? (
              <p className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-warning-fg">
                P5 seat — never auto-allotted. Saving will mark source as Manual.
              </p>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Rationale
              </span>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                disabled={!canMutate || selected.status === "confirmed"}
              />
            </label>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!selected) return;
          startTransition(async () => {
            const result = await confirmAllotment(selected.id);
            setMessage(result.message);
            if (result.ok) {
              setConfirmOpen(false);
              setSelected(null);
            }
          });
        }}
        title="Confirm allotment?"
        description="Emails the delegate their committee and country. This cannot be undone from the UI."
        confirmLabel="Confirm & notify"
        loading={pending}
      />
    </div>
  );
}
