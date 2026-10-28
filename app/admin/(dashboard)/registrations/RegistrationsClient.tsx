"use client";

import { useMemo, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { RegistrationGateCard } from "@/components/admin/RegistrationGateCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Download } from "@/components/icons/Download";
import { MoreVertical } from "@/components/icons/MoreVertical";
import { Search } from "@/components/icons/Search";
import {
  confirmPayment,
  getPaymentProofUrl,
  rejectDelegatePayment,
  rejectDelegationPayment,
  resendRegistrationEmail,
} from "@/lib/admin/actions";
import type {
  AdminRole,
  DelegateRecord,
  DelegationRecord,
  PaymentStatus,
} from "@/lib/admin/types";
import {
  formatAdminDate,
  formatNumber,
  formatPkr,
  titleCase,
} from "@/lib/utils";

type Tab = "delegates" | "delegations";

type RegistrationsClientProps = {
  delegates: DelegateRecord[];
  delegations: DelegationRecord[];
  role: AdminRole;
  registrationOpen: boolean;
  /** Committee slug → abbreviation, so preferences read "HCC", not a slug. */
  committeeAbbr: Record<string, string>;
  /** Fee owed per registration id (quote, or current pricing for old rows). */
  owedById: Record<string, number>;
};

const EXPERIENCE_LABEL: Record<string, string> = {
  "first-time": "First time",
  "1-3": "1–3",
  "4-9": "4–9",
  "10-plus": "10+",
};

const PAGE_SIZE = 10;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-line py-2 text-sm last:border-b-0">
      <dt className="text-fg-faint">{label}</dt>
      <dd className="text-fg">{value || "-"}</dd>
    </div>
  );
}

function exportCsv(filename: string, header: string, lines: string[]) {
  const blob = new Blob([[header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function RegistrationsClient({
  delegates,
  delegations,
  role,
  registrationOpen,
  committeeAbbr,
  owedById,
}: RegistrationsClientProps) {
  const canMutate = role === "admin" || role === "eb";
  // Reviewers can confirm or reject payments too, but not edit anything else.
  const canPay = canMutate || role === "reviewer";
  const prefLabel = (slug: string) => committeeAbbr[slug] ?? slug.toUpperCase();
  const [tab, setTab] = useState<Tab>("delegates");
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DelegateRecord | null>(null);
  const [selectedDelegation, setSelectedDelegation] =
    useState<DelegationRecord | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Confirm-payment form: amount received (editable for discounts), a note,
  // and the transfer screenshot, which is required.
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payProof, setPayProof] = useState<File | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [proofView, setProofView] = useState<{ url: string; title: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Failures shown inside the open drawer, where the admin is looking.
  const [drawerNote, setDrawerNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const institutions = useMemo(() => {
    return [...new Set(delegates.map((d) => d.institution))].sort();
  }, [delegates]);

  const filteredDelegates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return delegates.filter((d) => {
      if (paymentFilter && d.paymentStatus !== paymentFilter) return false;
      if (experienceFilter && d.experience !== experienceFilter) return false;
      if (institutionFilter && d.institution !== institutionFilter) return false;
      if (!q) return true;
      return [
        d.fullName,
        d.email,
        d.delegateCode,
        d.reference,
        d.institution,
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [delegates, paymentFilter, experienceFilter, institutionFilter, query]);

  const filteredDelegations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return delegations.filter((d) => {
      if (paymentFilter && d.paymentStatus !== paymentFilter) return false;
      if (!q) return true;
      return [
        d.institutionName,
        d.reference,
        d.headName,
        d.headEmail,
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [delegations, paymentFilter, query]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      (tab === "delegates"
        ? filteredDelegates.length
        : filteredDelegations.length) / PAGE_SIZE,
    ),
  );
  // Clamp: an action can empty the last page, which must not leave an empty
  // table where the previous page still has rows.
  const currentPage = Math.min(page, pageCount);
  const pagedDelegates = filteredDelegates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const pagedDelegations = filteredDelegations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function runAction(
    action: () => Promise<{ ok: boolean; message: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      setDrawerNote(result.ok ? null : result.message);
      setConfirmOpen(false);
      setRejectOpen(false);
      if (result.ok) {
        setRejectReason("");
        setSelected(null);
        setSelectedDelegation(null);
      }
    });
  }

  /** The registration the confirm / proof / transcript buttons act on. */
  function target(): { kind: "delegate" | "delegation"; id: string } | null {
    if (selectedDelegation) return { kind: "delegation", id: selectedDelegation.id };
    if (selected) return { kind: "delegate", id: selected.id };
    return null;
  }

  function owedFor(): number {
    const t = target();
    return t ? (owedById[t.id] ?? 0) : 0;
  }

  function amountChanged(): boolean {
    const typed = payAmount.replace(/[,\s]/g, "");
    return typed !== "" && Number(typed) !== owedFor();
  }

  function openConfirm() {
    setPayAmount(String(owedFor()));
    setPayNote("");
    setPayProof(null);
    setPayError(null);
    setConfirmOpen(true);
  }

  function submitConfirm() {
    const t = target();
    if (!t) return;
    if (!payProof) {
      setPayError("Attach the payment screenshot before confirming.");
      return;
    }
    if (amountChanged() && !payNote.trim()) {
      setPayError("Add a note explaining why the amount differs from the quote.");
      return;
    }
    const form = new FormData();
    form.set("kind", t.kind);
    form.set("id", t.id);
    form.set("amount", payAmount);
    form.set("note", payNote);
    form.set("proof", payProof);
    setPayError(null);
    startTransition(async () => {
      const result = await confirmPayment(form);
      setMessage(result.message);
      if (result.ok) {
        setConfirmOpen(false);
        setSelected(null);
        setSelectedDelegation(null);
        setDrawerNote(null);
      } else {
        // Keep the dialog open so the screenshot and amount are not lost.
        setPayError(result.message);
      }
    });
  }

  function viewProof() {
    const t = target();
    if (!t) return;
    const title = `Payment screenshot · ${selectedDelegation?.reference ?? selected?.reference ?? ""}`;
    startTransition(async () => {
      const result = await getPaymentProofUrl(t.kind, t.id);
      if (result.ok && result.url) setProofView({ url: result.url, title });
      else setDrawerNote(result.message);
    });
  }

  function openTranscript() {
    const t = target();
    if (t) window.open(`/admin/transcript/${t.kind}/${t.id}`, "_blank", "noopener");
  }

  const membersOfSelected = selectedDelegation
    ? delegates
        .filter((d) => d.delegationId === selectedDelegation.id)
        .sort(
          (a, b) =>
            Number(b.isHeadDelegate) - Number(a.isHeadDelegate) ||
            a.fullName.localeCompare(b.fullName),
        )
    : [];

  function handleExport() {
    if (tab === "delegates") {
      exportCsv(
        "meritmun-delegates.csv",
        "Code,Name,Email,Phone,Institution,Pref1,Experience,Payment,Amount PKR,Registered",
        filteredDelegates.map((d) =>
          [
            d.delegateCode,
            d.fullName,
            d.email,
            d.phone,
            d.institution,
            d.committeePrefs[0] ? prefLabel(d.committeePrefs[0]) : "",
            d.experience,
            d.paymentStatus,
            d.paymentAmount ?? "",
            formatAdminDate(d.createdAt),
          ]
            .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
            .join(","),
        ),
      );
      return;
    }
    exportCsv(
      "meritmun-delegations.csv",
      "Reference,Institution,Head,Email,Phone,Size,Payment,Amount PKR,Registered",
      filteredDelegations.map((d) =>
        [
          d.reference,
          d.institutionName,
          d.headName,
          d.headEmail,
          d.headPhone,
          d.delegationSize,
          d.paymentStatus,
          d.paymentAmount ?? "",
          formatAdminDate(d.createdAt),
        ]
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Registrations"
        description="Search, filter, and action payments for delegates and delegations."
      />

      <RegistrationGateCard
        open={registrationOpen}
        canEdit={canMutate}
      />

      <Tabs
        tabs={[
          { id: "delegates", label: "Delegates" },
          { id: "delegations", label: "Delegations" },
        ]}
        value={tab}
        onChange={(id) => {
          setTab(id as Tab);
          setPage(1);
          setSelected(null);
          setSelectedDelegation(null);
        }}
        label="Registration lists"
        idBase="registrations"
        variant="underline"
      />

      {message ? (
        <p
          role="status"
          className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-fg-muted"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, code..."
            aria-label="Search name, email, code"
            className="h-9 w-full rounded-sm border border-line bg-surface pl-8 pr-3 text-sm text-fg placeholder:text-fg-faint focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-focus"
          />
        </div>
        <Select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All Statuses" },
            { value: "pending", label: "Pending Verification" },
            { value: "confirmed", label: "Confirmed" },
            { value: "rejected", label: "Rejected" },
          ]}
          className="min-h-9 w-44 text-sm"
        />
        {tab === "delegates" ? (
          <>
            <Select
              value={experienceFilter}
              onChange={(e) => {
                setExperienceFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Any Experience" },
                { value: "first-time", label: "First time" },
                { value: "1-3", label: "1–3" },
                { value: "4-9", label: "4–9" },
                { value: "10-plus", label: "10+" },
              ]}
              className="min-h-9 w-40 text-sm"
            />
            <Select
              value={institutionFilter}
              onChange={(e) => {
                setInstitutionFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "All Institutions" },
                ...institutions.map((name) => ({ value: name, label: name })),
              ]}
              className="min-h-9 w-48 text-sm"
            />
          </>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          iconStart={<Download className="size-4" />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </div>

      {tab === "delegates" ? (
        filteredDelegates.length === 0 ? (
          <EmptyState
            title="No delegates match"
            body="Clear filters or wait for new individual registrations."
          />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead className="bg-surface-inset">
                <tr className="border-b border-line">
                  <th className="w-10 px-3 py-2.5">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Delegate Code
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Name & Email
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Institution
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Pref 1
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Exp
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Payment Status
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Registered At
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedDelegates.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-3">
                      <input type="checkbox" className="size-4 accent-[var(--accent)]" aria-label={`Select ${row.fullName}`} />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-fg">
                      {row.delegateCode}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-fg">{row.fullName}</p>
                      <p className="text-xs text-fg-faint">{row.email}</p>
                    </td>
                    <td className="px-3 py-3 text-fg-muted">{row.institution}</td>
                    <td className="px-3 py-3 uppercase text-fg-muted">
                      {row.committeePrefs[0] ? prefLabel(row.committeePrefs[0]) : "-"}
                    </td>
                    <td className="px-3 py-3 text-fg-muted">
                      {EXPERIENCE_LABEL[row.experience] ?? row.experience}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge kind="payment" status={row.paymentStatus} />
                    </td>
                    <td className="px-3 py-3 tabular-nums text-fg-muted">
                      {formatAdminDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        aria-label={`Actions for ${row.fullName}`}
                        className="grid size-8 place-items-center rounded-sm text-fg-faint hover:bg-surface-inset hover:text-fg"
                        onClick={() => setSelected(row)}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              total={filteredDelegates.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              noun="entries"
            />
          </div>
        )
      ) : filteredDelegations.length === 0 ? (
        <EmptyState
          title="No delegations yet"
          body="Institutional applications will list here with head contacts and sizes."
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line">
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Institution
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Reference
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Head
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Size
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Payment Status
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Amount
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedDelegations.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-fg">{row.institutionName}</p>
                    <p className="text-xs text-fg-faint">
                      {row.institutionCity} · {titleCase(row.institutionType)}
                    </p>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{row.reference}</td>
                  <td className="px-3 py-3">
                    <p>{row.headName}</p>
                    <p className="text-xs text-fg-faint">{row.headEmail}</p>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {formatNumber(row.delegationSize)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge kind="payment" status={row.paymentStatus} />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-fg-muted">
                    {row.paymentAmount != null
                      ? formatPkr(row.paymentAmount)
                      : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      aria-label={`View ${row.institutionName}`}
                      className="grid size-8 place-items-center rounded-sm text-fg-faint hover:bg-surface-inset hover:text-fg"
                      onClick={() => setSelectedDelegation(row)}
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={filteredDelegations.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun="entries"
          />
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setDrawerNote(null);
        }}
        title={selected?.fullName ?? "Delegate"}
        size="lg"
        footer={
          selected && canPay ? (
            <>
              {canMutate ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    runAction(() => resendRegistrationEmail(selected.id))
                  }
                >
                  Resend email
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={openTranscript}>
                Transcript
              </Button>
              {selected.paymentProofPath ? (
                <Button variant="ghost" size="sm" disabled={pending} onClick={viewProof}>
                  View screenshot
                </Button>
              ) : null}
              {selected.paymentStatus === "pending" &&
              !selected.delegationId &&
              !selected.paidBy ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                  setRejectReason("");
                  setRejectOpen(true);
                }}
                    className="border-danger text-danger-fg"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={pending}
                    onClick={openConfirm}
                  >
                    Confirm payment
                  </Button>
                </>
              ) : null}
            </>
          ) : undefined
        }
      >
        {drawerNote ? (
          <p role="alert" className="mb-3 text-sm text-danger-fg">
            {drawerNote}
          </p>
        ) : null}
        {selected ? (
          <dl>
            <DetailRow label="Reference" value={selected.reference} />
            <DetailRow label="Code" value={selected.delegateCode} />
            <DetailRow label="Email" value={selected.email} />
            <DetailRow label="Phone" value={selected.phone} />
            <DetailRow label="Institution" value={selected.institution} />
            <DetailRow label="City" value={selected.city} />
            <DetailRow
              label="Experience"
              value={EXPERIENCE_LABEL[selected.experience] ?? selected.experience}
            />
            <DetailRow label="Awards" value={selected.priorAwards ?? "-"} />
            <DetailRow
              label="Prefs"
              value={selected.committeePrefs.map(prefLabel).join(", ")}
            />
            <DetailRow
              label="Fee option"
              value={selected.withSocial === false ? "Without social" : "With social"}
            />
            <DetailRow
              label="Quoted fee"
              value={formatPkr(owedById[selected.id] ?? selected.quotedAmount ?? 0)}
            />
            <DetailRow
              label="Payment"
              value={
                selected.paymentAmount != null
                  ? `${formatPkr(selected.paymentAmount)} · ${selected.paymentStatus}`
                  : selected.paymentStatus
              }
            />
            {selected.paidBy ? (
              <DetailRow
                label="Paid by"
                value={`${delegates.find((d) => d.id === selected.paidBy)?.fullName ?? "Their co-delegate"}, who registered them. Confirm that registration to confirm both.`}
              />
            ) : null}
            {selected.pairId ? (
              <DetailRow
                label="Co-delegate"
                value={
                  delegates.find((d) => d.pairId === selected.pairId && d.id !== selected.id)
                    ?.fullName ?? "Paired at allotment"
                }
              />
            ) : null}
            {selected.delegationId ? (
              <DetailRow
                label="Delegation"
                value={`${delegations.find((d) => d.id === selected.delegationId)?.institutionName ?? "Delegation"}, payment is confirmed on the Delegations tab`}
              />
            ) : null}
            {selected.paymentNote ? (
              <DetailRow label="Payment note" value={selected.paymentNote} />
            ) : null}
            {selected.rejectionReason ? (
              <DetailRow label="Rejection" value={selected.rejectionReason} />
            ) : null}
            <DetailRow
              label="Registered"
              value={formatAdminDate(selected.createdAt)}
            />
          </dl>
        ) : null}
      </Drawer>

      <Drawer
        open={Boolean(selectedDelegation)}
        onClose={() => {
          setSelectedDelegation(null);
          setDrawerNote(null);
        }}
        title={selectedDelegation?.institutionName ?? "Delegation"}
        size="lg"
        footer={
          selectedDelegation && canPay ? (
            <>
              <Button variant="ghost" size="sm" onClick={openTranscript}>
                Transcript
              </Button>
              {selectedDelegation.paymentProofPath ? (
                <Button variant="ghost" size="sm" disabled={pending} onClick={viewProof}>
                  View screenshot
                </Button>
              ) : null}
              {selectedDelegation.paymentStatus === "pending" ? (
              <>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setRejectReason("");
                  setRejectOpen(true);
                }}
                className="border-danger text-danger-fg"
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={pending}
                onClick={openConfirm}
              >
                Confirm payment
              </Button>
              </>
              ) : null}
            </>
          ) : undefined
        }
      >
        {drawerNote ? (
          <p role="alert" className="mb-3 text-sm text-danger-fg">
            {drawerNote}
          </p>
        ) : null}
        {selectedDelegation ? (
          <div className="flex flex-col gap-4">
            <dl>
              <DetailRow label="Reference" value={selectedDelegation.reference} />
              <DetailRow label="Head" value={selectedDelegation.headName} />
              <DetailRow label="Email" value={selectedDelegation.headEmail} />
              <DetailRow label="Phone" value={selectedDelegation.headPhone} />
              <DetailRow
                label="Size"
                value={String(selectedDelegation.delegationSize)}
              />
              <DetailRow
                label="Quoted fee"
                value={formatPkr(
                  owedById[selectedDelegation.id] ?? selectedDelegation.quotedAmount ?? 0,
                )}
              />
              <DetailRow
                label="Payment"
                value={
                  selectedDelegation.paymentAmount != null
                    ? `${formatPkr(selectedDelegation.paymentAmount)} · ${selectedDelegation.paymentStatus}`
                    : (selectedDelegation.paymentStatus as PaymentStatus)
                }
              />
              {selectedDelegation.paymentNote ? (
                <DetailRow label="Payment note" value={selectedDelegation.paymentNote} />
              ) : null}
              <DetailRow label="Notes" value={selectedDelegation.notes ?? "-"} />
            </dl>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Linked members ({membersOfSelected.length})
              </h3>
              <ul className="mt-2 divide-y divide-line rounded-sm border border-line">
                {membersOfSelected.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-fg-muted">
                    No roster on file for this delegation.
                  </li>
                ) : (
                  membersOfSelected.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-fg">
                          {m.fullName}
                          {m.isHeadDelegate ? (
                            <span className="ml-1.5 text-xs font-normal text-fg-faint">
                              (head)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-fg-faint">
                          <span className="font-mono">{m.delegateCode}</span> ·{" "}
                          {m.phone} · {m.email}
                        </p>
                        <p className="text-xs text-fg-faint">
                          {EXPERIENCE_LABEL[m.experience] ?? m.experience} ·{" "}
                          {m.committeePrefs.map(prefLabel).join(" › ")}
                        </p>
                      </div>
                      <StatusBadge kind="payment" status={m.paymentStatus} />
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitConfirm}
        title={selectedDelegation ? "Confirm delegation payment" : "Confirm payment"}
        description={
          <div className="flex flex-col gap-3">
            <p>
              {selectedDelegation
                ? `Marks the delegation and all ${membersOfSelected.length} roster members as paid, emails the head delegate, and runs merit allotment for every member.`
                : "Marks this delegate as paid, emails them, and runs merit allotment."}
            </p>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">Amount received (PKR)</span>
              <Input
                inputMode="numeric"
                value={payAmount}
                disabled={!payProof}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <span className="text-xs text-fg-faint">
                Quoted fee: {formatPkr(owedFor())}.{" "}
                {payProof
                  ? "Change it for a discount or a part waiver."
                  : "Attach the screenshot below to edit the amount."}
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">
                Note{amountChanged() ? " (required, why is it different?)" : " (optional)"}
              </span>
              <Textarea
                rows={2}
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. 10% sibling discount approved by the SG"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">Payment screenshot (required)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                onChange={(e) => setPayProof(e.target.files?.[0] ?? null)}
                className="text-sm text-fg-muted file:mr-3 file:rounded-sm file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-fg"
              />
              <span className="text-xs text-fg-faint">
                PNG, JPG, WEBP, HEIC or PDF, up to 4 MB.
              </span>
            </label>
            {payError ? (
              <p role="alert" className="text-sm text-danger-fg">
                {payError}
              </p>
            ) : null}
          </div>
        }
        confirmLabel="Confirm payment"
        loading={pending}
      />

      <Drawer
        open={Boolean(proofView)}
        onClose={() => setProofView(null)}
        title={proofView?.title ?? "Payment screenshot"}
        size="lg"
      >
        {proofView ? (
          proofView.url.startsWith("data:application/pdf") ||
          /\.pdf(\?|$)/i.test(proofView.url) ? (
            <iframe
              src={proofView.url}
              title={proofView.title}
              className="h-[70vh] w-full rounded-sm border border-line"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img
              src={proofView.url}
              alt={proofView.title}
              className="w-full rounded-sm border border-line object-contain"
            />
          )
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          if (selectedDelegation) {
            const id = selectedDelegation.id;
            runAction(() => rejectDelegationPayment(id, rejectReason));
            return;
          }
          if (!selected) return;
          runAction(() => rejectDelegatePayment(selected.id, rejectReason));
        }}
        title={selectedDelegation ? "Reject delegation payment?" : "Reject payment?"}
        description={
          <div className="flex flex-col gap-2">
            <p>
              Optionally record a reason for the team. Any seat already held is
              released for re-allotment.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason (optional)"
            />
          </div>
        }
        confirmLabel="Reject"
        tone="danger"
        loading={pending}
      />
    </div>
  );
}
