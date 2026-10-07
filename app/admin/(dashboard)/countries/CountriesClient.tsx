"use client";

import { useMemo, useState, useTransition } from "react";
import { KpiCard } from "@/components/admin/KpiCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Switch } from "@/components/admin/Switch";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { FileText } from "@/components/icons/FileText";
import { Search } from "@/components/icons/Search";
import { setAttendance } from "@/lib/admin/allotment-actions";
import type { CommitteeSeats, Seat } from "@/lib/admin/seat-matrix";
import type { AdminRole } from "@/lib/admin/types";
import { cn, formatNumber } from "@/lib/utils";

type SeatFilter = "all" | "taken" | "left";

type CountriesClientProps = {
  matrix: CommitteeSeats[];
  days: { id: string; label: string }[];
  /** `${delegateId}:${dayId}` for every present mark. */
  attendance: string[];
  role: AdminRole;
};

export function CountriesClient({
  matrix,
  days,
  attendance,
  role,
}: CountriesClientProps) {
  const canMutate = role === "admin" || role === "eb";
  const [committeeId, setCommitteeId] = useState("overview");
  const [filter, setFilter] = useState<SeatFilter>("all");
  const [query, setQuery] = useState("");
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [present, setPresent] = useState(() => new Set(attendance));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totals = useMemo(
    () =>
      matrix.reduce(
        (sum, c) => ({
          total: sum.total + c.total,
          taken: sum.taken + c.taken,
          left: sum.left + c.left,
        }),
        { total: 0, taken: 0, left: 0 },
      ),
    [matrix],
  );

  const active = matrix.find((c) => c.committee.id === committeeId) ?? null;

  const seats = useMemo(() => {
    if (!active) return [];
    const q = query.trim().toLowerCase();
    return [...active.seats, ...active.offPool].filter((seat) => {
      if (filter === "taken" && !seat.holder) return false;
      if (filter === "left" && seat.holder) return false;
      if (!q) return true;
      return [
        seat.portfolio.countryName,
        seat.holder?.delegate.fullName ?? "",
        seat.holder?.delegate.delegateCode ?? "",
        seat.holder?.delegate.institution ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [active, filter, query]);

  function toggleAttendance(delegateId: string, dayId: string, next: boolean) {
    const key = `${delegateId}:${dayId}`;
    setPresent((current) => {
      const copy = new Set(current);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
    startTransition(async () => {
      const result = await setAttendance(delegateId, dayId, next);
      if (!result.ok) {
        setMessage(result.message);
        setPresent((current) => {
          const copy = new Set(current);
          if (next) copy.delete(key);
          else copy.add(key);
          return copy;
        });
      }
    });
  }

  function presentCount(c: CommitteeSeats, dayId: string): number {
    return [...c.seats, ...c.offPool].filter(
      (s) => s.holder && present.has(`${s.holder.delegate.id}:${dayId}`),
    ).length;
  }

  const printQuery = active ? `?committee=${active.committee.id}` : "";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Country Matrix"
        description="Every country in every committee, who holds it, and who showed up."
        actions={
          <>
            <ButtonLink
              href={`/admin/roll-call${printQuery}`}
              variant="outline"
              size="sm"
              iconStart={<FileText className="size-4" />}
              target="_blank"
            >
              Roll call
            </ButtonLink>
            <ButtonLink
              href={`/admin/waivers${printQuery}`}
              variant="outline"
              size="sm"
              iconStart={<FileText className="size-4" />}
              target="_blank"
            >
              Waivers
            </ButtonLink>
          </>
        }
      />

      {message ? (
        <p
          role="status"
          className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-danger-fg"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={committeeId}
          onChange={(e) => {
            setCommitteeId(e.target.value);
            setFilter("all");
          }}
          aria-label="Committee"
          options={[
            { value: "overview", label: "All committees — overview" },
            ...matrix.map((c) => ({
              value: c.committee.id,
              label: `${c.committee.abbr} — ${c.taken}/${c.total} taken`,
            })),
          ]}
          className="min-h-9 w-72 text-sm"
        />
        {days.length > 0 ? (
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
            <Switch
              checked={attendanceMode}
              label="Attendance mode"
              onChange={setAttendanceMode}
            />
            Attendance mode
          </span>
        ) : null}
      </div>

      {!active ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Countries in pools" value={formatNumber(totals.total)} />
            <KpiCard label="Seats taken" value={formatNumber(totals.taken)} />
            <KpiCard label="Seats left" value={formatNumber(totals.left)} />
          </div>
          <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead className="bg-surface-inset">
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Committee</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Total</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Taken</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Left</th>
                  {attendanceMode
                    ? days.map((d) => (
                        <th key={d.id} className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                          {d.label}
                        </th>
                      ))
                    : null}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {matrix.map((c) => (
                  <tr key={c.committee.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-fg">{c.committee.abbr}</span>
                      {c.committee.allotmentsPaused ? (
                        <Badge tone="warning" size="sm" className="ml-2">
                          Paused
                        </Badge>
                      ) : null}
                      {c.offPool.length > 0 ? (
                        <Badge tone="neutral" size="sm" className="ml-2">
                          {c.offPool.length} off-pool
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{c.total}</td>
                    <td className="px-4 py-3 tabular-nums">{c.taken}</td>
                    <td
                      className={cn(
                        "px-4 py-3 tabular-nums",
                        c.left === 0 && c.total > 0 ? "text-danger-fg" : "text-fg",
                      )}
                    >
                      {c.left}
                    </td>
                    {attendanceMode
                      ? days.map((d) => (
                          <td key={d.id} className="px-4 py-3 tabular-nums text-fg-muted">
                            {presentCount(c, d.id)}/{c.taken}
                          </td>
                        ))
                      : null}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-sm font-medium text-brand-fg hover:text-brand"
                        onClick={() => setCommitteeId(c.committee.id)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label={`${active.committee.abbr} countries`} value={formatNumber(active.total)} />
            <KpiCard label="Taken" value={formatNumber(active.taken)} />
            <KpiCard label="Left" value={formatNumber(active.left)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              tabs={[
                { id: "all", label: "All" },
                { id: "taken", label: "Taken" },
                { id: "left", label: "Left" },
              ]}
              value={filter}
              onChange={(id) => setFilter(id as SeatFilter)}
              label="Seat filter"
              idBase="country-matrix"
              variant="underline"
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Country, delegate, code"
                aria-label="Search seats"
                className="min-h-9 w-56 pl-8 text-sm"
              />
            </div>
          </div>

          {seats.length === 0 ? (
            <EmptyState
              title={active.total === 0 ? "This committee has no countries" : "Nothing matches"}
              body={
                active.total === 0
                  ? "Add countries to its pool from the Committees page."
                  : "Try another filter or search."
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
              <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                <thead className="bg-surface-inset">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Country</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Delegate</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Phone</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">Status</th>
                    {attendanceMode
                      ? days.map((d) => (
                          <th key={d.id} className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                            {d.label}
                          </th>
                        ))
                      : null}
                  </tr>
                </thead>
                <tbody>
                  {seats.map((seat) => (
                    <SeatRow
                      key={seat.portfolio.id}
                      seat={seat}
                      offPool={!seat.portfolio.isActive}
                      days={attendanceMode ? days : []}
                      present={present}
                      canMutate={canMutate && !pending}
                      onToggle={toggleAttendance}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SeatRow({
  seat,
  offPool,
  days,
  present,
  canMutate,
  onToggle,
}: {
  seat: Seat;
  offPool: boolean;
  days: { id: string; label: string }[];
  present: Set<string>;
  canMutate: boolean;
  onToggle: (delegateId: string, dayId: string, next: boolean) => void;
}) {
  const holder = seat.holder;
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 font-medium text-fg">
          {seat.portfolio.countryName}
          {seat.portfolio.isP5 ? (
            <Badge tone="warning" size="sm">
              P5
            </Badge>
          ) : null}
          {offPool ? (
            <Badge tone="neutral" size="sm">
              Off-pool
            </Badge>
          ) : null}
        </span>
        <p className="text-xs text-fg-faint">Hardness {seat.portfolio.hardness}/10</p>
      </td>
      <td className="px-4 py-3">
        {holder ? (
          <>
            <p className="font-semibold text-fg">
              {holder.delegate.fullName}
              {holder.delegate.isHeadDelegate ? (
                <span className="ml-1.5 text-xs font-normal text-fg-faint">(head)</span>
              ) : null}
            </p>
            <p className="text-xs text-fg-faint">
              <span className="font-mono">{holder.delegate.delegateCode}</span> ·{" "}
              {holder.delegationName ?? holder.delegate.institution}
            </p>
          </>
        ) : (
          <span className="text-fg-faint">Free</span>
        )}
      </td>
      <td className="px-4 py-3 text-fg-muted">{holder?.delegate.phone ?? "—"}</td>
      <td className="px-4 py-3">
        {holder ? (
          <Badge
            tone={holder.allotment.status === "confirmed" ? "success" : "warning"}
            size="sm"
          >
            {holder.allotment.status === "confirmed" ? "Issued" : "Draft"}
          </Badge>
        ) : (
          <span className="text-fg-faint">—</span>
        )}
      </td>
      {days.map((day) => (
        <td key={day.id} className="px-4 py-3">
          {holder ? (
            <Switch
              checked={present.has(`${holder.delegate.id}:${day.id}`)}
              label={`${holder.delegate.fullName} present on ${day.label}`}
              disabled={!canMutate}
              onChange={(next) => onToggle(holder.delegate.id, day.id, next)}
            />
          ) : null}
        </td>
      ))}
    </tr>
  );
}
