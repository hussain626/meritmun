"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { PkrInput } from "@/components/admin/PkrInput";
import { Switch } from "@/components/admin/Switch";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Check } from "@/components/icons/Check";
import { Info } from "@/components/icons/Info";
import { Pencil } from "@/components/icons/Pencil";
import { Plus } from "@/components/icons/Plus";
import { Sparkle } from "@/components/icons/Sparkle";
import { Wallet } from "@/components/icons/Wallet";
import {
  deleteBankAccount,
  savePricing,
  upsertBankAccount,
  type PricingSaveInput,
} from "@/lib/admin/actions";
import type {
  AdminRole,
  BankAccount,
  PricingSettings,
} from "@/lib/admin/types";
import { formatAdminDate, formatPkr } from "@/lib/utils";

type PricingClientProps = {
  pricing: PricingSettings;
  bankAccounts: BankAccount[];
  role: AdminRole;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

export function PricingClient({
  pricing,
  bankAccounts,
  role,
}: PricingClientProps) {
  const readOnly = role === "eb";
  const canEdit = role === "admin";

  const [form, setForm] = useState<PricingSaveInput>({
    currency: "PKR",
    delegateFee: pricing.delegateFee,
    delegationFee: pricing.delegationFee,
    perDelegateFee: pricing.perDelegateFee,
    delegationMin: pricing.delegationMin,
    delegationMax: pricing.delegationMax,
    earlyBirdEnabled: pricing.earlyBirdEnabled,
    earlyBirdDelegateFee: pricing.earlyBirdDelegateFee,
    earlyBirdPerDelegateFee: pricing.earlyBirdPerDelegateFee,
    earlyBirdEndsAt: pricing.earlyBirdEndsAt,
  });
  const [accounts, setAccounts] = useState(bankAccounts);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewDelegate = useMemo(() => {
    if (form.earlyBirdEnabled && form.earlyBirdDelegateFee != null) {
      return form.earlyBirdDelegateFee;
    }
    return form.delegateFee;
  }, [form]);

  const discountPct = useMemo(() => {
    if (
      !form.earlyBirdEnabled ||
      form.earlyBirdDelegateFee == null ||
      form.delegateFee <= 0
    ) {
      return 0;
    }
    return Math.round(
      (1 - form.earlyBirdDelegateFee / form.delegateFee) * 100,
    );
  }, [form]);

  function patch<K extends keyof PricingSaveInput>(
    key: K,
    value: PricingSaveInput[K],
  ) {
    setForm((prev) => ({ ...prev, currency: "PKR", [key]: value }));
  }

  function saveAll() {
    startTransition(async () => {
      const result = await savePricing({ ...form, currency: "PKR" });
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pricing Configuration"
        description="Manage individual, delegation fees, and early bird phases. All amounts are in PKR."
        actions={
          canEdit ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              loading={pending}
              onClick={saveAll}
            >
              Save All Changes
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

      {readOnly ? (
        <p className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-warning-fg">
          Read-only for EB — ask an admin to change fees or bank details.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <section className="rounded-sm border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-base font-bold text-fg">Base Fee Structure</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Fees charged in Pakistani Rupee (PKR).
            </p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-fg">
                  Individual Delegate
                </h3>
                <Field label="Standard Fee">
                  <PkrInput
                    value={form.delegateFee}
                    disabled={!canEdit}
                    onChange={(e) =>
                      patch("delegateFee", Number(e.target.value) || 0)
                    }
                  />
                </Field>
                <Field label="Per-delegate (in a delegation)">
                  <PkrInput
                    value={form.perDelegateFee}
                    disabled={!canEdit}
                    onChange={(e) =>
                      patch("perDelegateFee", Number(e.target.value) || 0)
                    }
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-fg">Delegation</h3>
                <Field label="Delegation Registration Fee">
                  <PkrInput
                    value={form.delegationFee}
                    disabled={!canEdit}
                    onChange={(e) =>
                      patch("delegationFee", Number(e.target.value) || 0)
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Minimum delegates">
                    <Input
                      type="number"
                      min={1}
                      value={form.delegationMin}
                      disabled={!canEdit}
                      onChange={(e) =>
                        patch("delegationMin", Number(e.target.value) || 1)
                      }
                    />
                  </Field>
                  <Field label="Maximum delegates">
                    <Input
                      type="number"
                      min={1}
                      value={form.delegationMax}
                      disabled={!canEdit}
                      onChange={(e) =>
                        patch("delegationMax", Number(e.target.value) || 1)
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkle className="size-4 text-accent-fg" />
                <h2 className="text-base font-bold text-fg">Early Bird Phase</h2>
              </div>
              <Switch
                checked={form.earlyBirdEnabled}
                onChange={
                  canEdit
                    ? (next) => patch("earlyBirdEnabled", next)
                    : undefined
                }
                disabled={!canEdit}
                label="Early bird active"
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="End Date">
                <Input
                  type="datetime-local"
                  disabled={!canEdit || !form.earlyBirdEnabled}
                  value={
                    form.earlyBirdEndsAt
                      ? form.earlyBirdEndsAt.slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    patch(
                      "earlyBirdEndsAt",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </Field>
              <Field label="Discounted Individual Fee">
                <PkrInput
                  disabled={!canEdit || !form.earlyBirdEnabled}
                  value={form.earlyBirdDelegateFee ?? ""}
                  onChange={(e) =>
                    patch(
                      "earlyBirdDelegateFee",
                      e.target.value === ""
                        ? null
                        : Number(e.target.value) || 0,
                    )
                  }
                />
                {discountPct > 0 ? (
                  <p className="text-xs text-success-fg">
                    ↘ {discountPct}% discount from standard.
                  </p>
                ) : null}
              </Field>
              <Field label="Discounted per-delegate">
                <PkrInput
                  disabled={!canEdit || !form.earlyBirdEnabled}
                  value={form.earlyBirdPerDelegateFee ?? ""}
                  onChange={(e) =>
                    patch(
                      "earlyBirdPerDelegateFee",
                      e.target.value === ""
                        ? null
                        : Number(e.target.value) || 0,
                    )
                  }
                />
              </Field>
            </div>
            <p className="mt-4 flex gap-2 rounded-sm bg-accent/15 px-3 py-2.5 text-sm text-fg">
              <Info className="mt-0.5 size-4 shrink-0 text-warning-fg" />
              After this date, the system will automatically revert to Standard
              Pricing on the public portal.
            </p>
          </section>

          <section className="rounded-sm border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-fg-muted" />
                <h2 className="text-base font-bold text-fg">Payment Accounts</h2>
              </div>
              {canEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  iconStart={<Plus className="size-4" />}
                  onClick={() =>
                    setEditingBank({
                      id: `bank-${Date.now()}`,
                      bankName: "",
                      accountTitle: "",
                      accountNumber: "",
                      iban: null,
                      branch: null,
                      instructions: null,
                      isActive: true,
                      sortOrder: accounts.length + 1,
                      createdAt: new Date().toISOString(),
                    })
                  }
                >
                  Add Account
                </Button>
              ) : null}
            </div>

            <div className="mt-4 overflow-x-auto rounded-sm border border-line">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead className="bg-surface-inset">
                  <tr className="border-b border-line">
                    <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                      Account Name
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                      Bank
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                      Details
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
                  {accounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-fg-muted"
                      >
                        No bank accounts configured.
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account) => (
                      <tr
                        key={account.id}
                        className="border-b border-line last:border-0"
                      >
                        <td className="px-3 py-3 font-medium text-fg">
                          {account.accountTitle}
                        </td>
                        <td className="px-3 py-3 text-fg-muted">
                          {account.bankName}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-mono text-xs text-fg">
                            A/C {account.accountNumber}
                          </p>
                          {account.iban ? (
                            <p className="font-mono text-xs text-fg-faint">
                              IBAN {account.iban}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            tone={account.isActive ? "success" : "neutral"}
                            size="sm"
                          >
                            {account.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          {canEdit ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                aria-label={`Edit ${account.bankName}`}
                                className="grid size-8 place-items-center rounded-sm text-fg-muted hover:bg-surface-inset hover:text-fg"
                                onClick={() => setEditingBank(account)}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-fg"
                                onClick={() => setDeleteId(account.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-sm border border-line bg-surface p-5 shadow-sm">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-fg-faint">
            Public portal preview
          </p>
          <p className="mt-4 text-sm font-medium text-fg-muted">
            Individual Delegate
          </p>
          {form.earlyBirdEnabled ? (
            <Badge tone="accent" size="sm" className="mt-2 uppercase">
              Early bird active
            </Badge>
          ) : null}
          <p className="mt-3 text-3xl font-bold tabular-nums text-fg">
            {formatPkr(previewDelegate)}
          </p>
          {form.earlyBirdEnabled &&
          form.earlyBirdDelegateFee != null &&
          form.earlyBirdDelegateFee < form.delegateFee ? (
            <p className="mt-1 text-sm text-fg-faint line-through">
              {formatPkr(form.delegateFee)}
            </p>
          ) : null}
          <ul className="mt-4 flex flex-col gap-2 text-sm text-fg-muted">
            {[
              "All committee sessions",
              "Delegate kit and materials",
              "Social events",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-success-fg" />
                {item}
              </li>
            ))}
          </ul>
          <ButtonLink
            href="/register"
            variant="secondary"
            size="sm"
            fullWidth
            className="mt-5"
          >
            Register Now
          </ButtonLink>
          {form.earlyBirdEnabled && form.earlyBirdEndsAt ? (
            <p className="mt-3 text-xs text-fg-muted">
              Ends: {formatAdminDate(form.earlyBirdEndsAt)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-fg-faint">
            Auto-updates at midnight · amounts in PKR
          </p>
          <p className="mt-4 text-sm text-fg-muted">
            Delegation: {formatPkr(form.perDelegateFee)} per head
            {form.delegationFee > 0
              ? ` · base ${formatPkr(form.delegationFee)}`
              : ""}
            {` · ${form.delegationMin}–${form.delegationMax} delegates`}
          </p>
        </aside>
      </div>

      {editingBank ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-canvas/70"
            onClick={() => setEditingBank(null)}
          />
          <div className="relative w-full max-w-lg rounded-sm border border-line bg-surface p-5 shadow-md">
            <h3 className="text-lg font-bold text-fg">
              {accounts.some((a) => a.id === editingBank.id)
                ? "Edit bank account"
                : "Add bank account"}
            </h3>
            <div className="mt-4 grid gap-3">
              <Field label="Bank name">
                <Input
                  value={editingBank.bankName}
                  onChange={(e) =>
                    setEditingBank({ ...editingBank, bankName: e.target.value })
                  }
                />
              </Field>
              <Field label="Account title">
                <Input
                  value={editingBank.accountTitle}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank,
                      accountTitle: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Account number">
                <Input
                  value={editingBank.accountNumber}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank,
                      accountNumber: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="IBAN">
                <Input
                  value={editingBank.iban ?? ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank,
                      iban: e.target.value || null,
                    })
                  }
                />
              </Field>
              <Field label="Branch">
                <Input
                  value={editingBank.branch ?? ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank,
                      branch: e.target.value || null,
                    })
                  }
                />
              </Field>
              <Field label="Instructions">
                <Textarea
                  rows={3}
                  value={editingBank.instructions ?? ""}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank,
                      instructions: e.target.value || null,
                    })
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={editingBank.isActive}
                  onChange={(e) =>
                    setEditingBank({
                      ...editingBank,
                      isActive: e.target.checked,
                    })
                  }
                />
                Active (shown publicly)
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingBank(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await upsertBankAccount(editingBank);
                    setMessage(result.message);
                    if (result.ok) {
                      setAccounts((prev) => {
                        const idx = prev.findIndex(
                          (a) => a.id === editingBank.id,
                        );
                        if (idx >= 0) {
                          const next = [...prev];
                          next[idx] = editingBank;
                          return next;
                        }
                        return [...prev, editingBank];
                      });
                      setEditingBank(null);
                    }
                  });
                }}
              >
                Save account
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          startTransition(async () => {
            const result = await deleteBankAccount(deleteId);
            setMessage(result.message);
            if (result.ok) {
              setAccounts((prev) => prev.filter((a) => a.id !== deleteId));
              setDeleteId(null);
            }
          });
        }}
        title="Remove bank account?"
        description="It will no longer appear on confirmation emails or the register flow."
        confirmLabel="Remove"
        tone="danger"
        loading={pending}
      />
    </div>
  );
}
