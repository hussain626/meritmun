"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { AlertTriangle } from "@/components/icons/AlertTriangle";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { CheckCircle } from "@/components/icons/CheckCircle";
import { CirclePlus } from "@/components/icons/CirclePlus";
import { Clock } from "@/components/icons/Clock";
import { Download } from "@/components/icons/Download";
import { FileText } from "@/components/icons/FileText";
import { LayoutGrid } from "@/components/icons/LayoutGrid";
import { LinkIcon } from "@/components/icons/Link";
import { Mail } from "@/components/icons/Mail";
import { Wallet } from "@/components/icons/Wallet";
import { KpiCard } from "@/components/admin/KpiCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { AnnouncementCard } from "@/components/admin/AnnouncementCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  AnnouncementPageOption,
  AnnouncementSettings,
} from "@/lib/admin/announcement";
import type {
  AdminRole,
  DelegateRecord,
  DelegationRecord,
  OverviewKpis,
} from "@/lib/admin/types";
import {
  cn,
  formatAdminDateTime,
  formatNumber,
  formatPkr,
  initialsFromName,
} from "@/lib/utils";

type RecentRow = {
  id: string;
  institution: string;
  typeLabel: string;
  createdAt: string;
  paymentStatus: DelegateRecord["paymentStatus"];
  overdue: boolean;
};

type OverviewClientProps = {
  kpis: OverviewKpis;
  delegates: DelegateRecord[];
  delegations: DelegationRecord[];
  announcement: AnnouncementSettings;
  pages: AnnouncementPageOption[];
  role: AdminRole;
};

const OVERDUE_MS = 7 * 24 * 60 * 60 * 1000;

function isOverdue(status: string, createdAt: string): boolean {
  if (status !== "pending") return false;
  return Date.now() - Date.parse(createdAt) > OVERDUE_MS;
}

export function OverviewClient({
  kpis,
  delegates,
  delegations,
  announcement,
  pages,
  role,
}: OverviewClientProps) {
  const [copied, setCopied] = useState(false);

  const recent = useMemo(() => {
    const rows: RecentRow[] = [
      ...delegates.map((d) => ({
        id: d.id,
        institution: d.institution,
        typeLabel: "Individual",
        createdAt: d.createdAt,
        paymentStatus: d.paymentStatus,
        overdue: isOverdue(d.paymentStatus, d.createdAt),
      })),
      ...delegations.map((d) => ({
        id: d.id,
        institution: d.institutionName,
        typeLabel: `Delegation (${d.delegationSize})`,
        createdAt: d.createdAt,
        paymentStatus: d.paymentStatus,
        overdue: isOverdue(d.paymentStatus, d.createdAt),
      })),
    ];
    return rows
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 8);
  }, [delegates, delegations]);

  const funnel = [
    {
      label: "Pending",
      value: kpis.pendingPayments,
      icon: Clock,
      tone: "warning" as const,
    },
    {
      label: "Confirmed",
      value: kpis.confirmedPayments,
      icon: CheckCircle,
      tone: "success" as const,
    },
    {
      label: "Allotted (Draft)",
      value: kpis.allottedDraft,
      icon: FileText,
      tone: "neutral" as const,
    },
    {
      label: "Allotment Confirmed",
      value: kpis.allottedConfirmed,
      icon: CheckCircle,
      tone: "neutral" as const,
    },
  ];

  const empty = kpis.totalRegistrations === 0;

  function exportReport() {
    const header = "Institution,Type,Date,Status";
    const lines = recent.map((row) =>
      [
        row.institution,
        row.typeLabel,
        formatAdminDateTime(row.createdAt),
        row.overdue ? "Overdue" : row.paymentStatus,
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
    anchor.download = "meritmun-overview.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyRegLink() {
    const url = `${window.location.origin}/register`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Overview"
        description="Summary for MERITMUN III."
        actions={
          <Button
            variant="outline"
            size="sm"
            iconStart={<Download className="size-4" />}
            onClick={exportReport}
          >
            Export Report
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Reg."
          value={formatNumber(kpis.totalRegistrations)}
          hint={`${formatNumber(kpis.totalDelegates)} Indiv. / ${formatNumber(kpis.delegationCount)} Del.`}
          icon={<LayoutGrid className="size-4" />}
        />
        <KpiCard
          label="Pending Pay"
          value={formatNumber(kpis.pendingPayments)}
          hint="Requires review."
          tone="warning"
          icon={<FileText className="size-4" />}
        />
        <KpiCard
          label="Confirmed Pay"
          value={formatNumber(kpis.confirmedPayments)}
          hint="Fully verified."
          tone="success"
          icon={<CheckCircle className="size-4" />}
        />
        <KpiCard
          label="Total Amount"
          value={formatPkr(kpis.totalAmount)}
          hint="Confirmed payments"
          icon={<Wallet className="size-4" />}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-sm border border-line bg-surface p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {funnel.map((step, index) => {
              const Icon = step.icon;
              const filled = step.value > 0;
              return (
                <div key={step.label} className="relative flex flex-col items-center text-center">
                  {index < funnel.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute left-[calc(50%+1.25rem)] top-5 hidden h-px w-[calc(100%-1.5rem)] bg-line sm:block"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-10 grid size-10 place-items-center rounded-full",
                      filled && step.tone === "warning" && "bg-accent text-on-accent",
                      filled && step.tone === "success" && "bg-brand text-on-brand",
                      (!filled || step.tone === "neutral") &&
                        "bg-surface-inset text-fg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-2 text-xs font-medium text-fg-muted">
                    {step.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-fg">
                    {formatNumber(step.value)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col rounded-sm border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-fg-faint">
              Open queries
            </p>
            {kpis.openQueries > 0 ? (
              <AlertTriangle className="size-4 text-danger-fg" />
            ) : null}
          </div>
          <p className="mt-2 text-4xl font-bold tabular-nums text-fg">
            {formatNumber(kpis.openQueries)}
          </p>
          <ButtonLink
            href="/admin/queries"
            variant="secondary"
            size="sm"
            fullWidth
            className="mt-auto"
            iconEnd={<ArrowRight className="size-4" />}
          >
            Go to Queries
          </ButtonLink>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-sm border border-line bg-surface shadow-sm">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">Recent Registrations</h2>
            <Link
              href="/admin/registrations"
              className="text-sm font-medium text-brand-fg hover:text-brand"
            >
              View All
            </Link>
          </div>

          {empty ? (
            <div className="p-4">
              <EmptyState
                title="No registrations yet"
                body="When delegates or delegations apply, they will appear here with payment status."
                action={
                  <ButtonLink href="/register" variant="primary" size="sm">
                    Open public register
                  </ButtonLink>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead className="bg-surface-inset">
                  <tr className="border-y border-line">
                    <th className="w-12 px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      <span className="sr-only">Avatar</span>
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                      Institution
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                      Type
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                      Date
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2.5">
                        <InitialsMedallion
                          initials={initialsFromName(row.institution)}
                          size="sm"
                          className="size-8 text-[0.6875rem]"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-fg">
                        {row.institution}
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted">{row.typeLabel}</td>
                      <td className="px-3 py-2.5 tabular-nums text-fg-muted">
                        {formatAdminDateTime(row.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          kind="payment"
                          status={row.paymentStatus}
                          overdue={row.overdue}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-fg-faint">
              Quick actions
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    void copyRegLink();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm border border-line bg-surface px-3 py-2.5 text-left text-sm font-medium text-fg",
                    "transition-colors duration-[var(--dur-fast)] hover:bg-surface-inset",
                    "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
                  )}
                >
                  <LinkIcon className="size-4 text-fg-muted" />
                  {copied ? "Link copied" : "Copy Reg. Link"}
                </button>
              </li>
              <li>
                <Link
                  href="/register"
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm border border-line bg-surface px-3 py-2.5 text-sm font-medium text-fg",
                    "transition-colors duration-[var(--dur-fast)] hover:bg-surface-inset",
                    "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
                  )}
                >
                  <CirclePlus className="size-4 text-fg-muted" />
                  Manual Registration
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/queries"
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm border border-line bg-surface px-3 py-2.5 text-sm font-medium text-fg",
                    "transition-colors duration-[var(--dur-fast)] hover:bg-surface-inset",
                    "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
                  )}
                >
                  <Mail className="size-4 text-fg-muted" />
                  Broadcast Email
                </Link>
              </li>
            </ul>
          </section>

          <div className="flex items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 shadow-sm">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            <span className="text-sm font-medium text-fg">System Operational</span>
          </div>
        </div>
      </div>

      <AnnouncementCard
        announcement={announcement}
        pages={pages}
        canEdit={role === "admin" || role === "eb"}
      />
    </div>
  );
}
