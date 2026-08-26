"use client";

import { useMemo, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Switch } from "@/components/admin/Switch";
import { Close } from "@/components/icons/Close";
import { Plus } from "@/components/icons/Plus";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  addPortfolios,
  removePortfolio,
  updatePortfolio,
} from "@/lib/admin/actions";
import type { Portfolio } from "@/lib/admin/types";
import { cn, formatNumber } from "@/lib/utils";

type PortfolioManagerProps = {
  committeeId: string;
  seats: number;
  portfolios: Portfolio[];
  canEdit: boolean;
  compact?: boolean;
  defaultHardness: number;
};

export function PortfolioManager({
  committeeId,
  seats,
  portfolios,
  canEdit,
  compact = false,
  defaultHardness,
}: PortfolioManagerProps) {
  const [rawList, setRawList] = useState("");
  const [hardness, setHardness] = useState(String(defaultHardness));
  const [notes, setNotes] = useState("");
  const [hardnessDraft, setHardnessDraft] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Portfolio | null>(null);
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(
    () =>
      [...portfolios].sort((a, b) =>
        a.countryName.localeCompare(b.countryName),
      ),
    [portfolios],
  );

  const activeCount = sorted.filter((p) => p.isActive).length;

  function runAction(
    action: () => Promise<{ ok: boolean; message: string }>,
    onOk?: () => void,
  ) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) onOk?.();
    });
  }

  function handleAdd() {
    runAction(
      () =>
        addPortfolios(committeeId, {
          rawList,
          hardness: Number(hardness) || defaultHardness,
          notes: compact ? undefined : notes,
        }),
      () => {
        setRawList("");
        setNotes("");
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        {compact ? (
          <p className="text-sm font-semibold text-fg">
            Allotment list{" "}
            <span className="font-normal text-fg-muted">
              ({formatNumber(activeCount)}/{formatNumber(seats)} seats)
            </span>
          </p>
        ) : (
          <h2 className="text-base font-bold text-fg">
            Allotment list{" "}
            <span className="text-sm font-normal text-fg-muted">
              ({formatNumber(activeCount)}/{formatNumber(seats)} seats)
            </span>
          </h2>
        )}
      </div>
      <p className="text-xs text-fg-faint">
        Countries and entities that can be allotted in this committee. P5 seats
        are flagged automatically and never auto-assigned.
      </p>

      {canEdit ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
              Add countries
            </span>
            <Textarea
              rows={compact ? 4 : 6}
              value={rawList}
              onChange={(e) => setRawList(e.target.value)}
              placeholder={"Pakistan\nIran\nGermany"}
              className="text-sm"
              required
            />
            <span className="text-xs text-fg-faint">
              One per line, or comma-separated.
            </span>
          </label>
          <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Default hardness
              </span>
              <Input
                type="number"
                min={1}
                max={10}
                value={hardness}
                onChange={(e) => setHardness(e.target.value)}
                className="min-h-9 text-sm"
              />
            </label>
            {compact ? null : (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                  Notes (optional)
                </span>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agenda-critical"
                  className="min-h-9 text-sm"
                />
              </label>
            )}
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={pending}
            iconStart={<Plus className="size-4" />}
            className="self-start"
          >
            Add to list
          </Button>
        </form>
      ) : null}

      {message ? (
        <p
          role="status"
          className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-fg-muted"
        >
          {message}
        </p>
      ) : null}

      {sorted.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line px-3 py-6 text-center text-sm text-fg-muted">
          No countries on this allotment list yet.
        </p>
      ) : (
        <div
          className={cn(
            "overflow-x-auto rounded-sm border border-line",
            compact ? "max-h-72 overflow-y-auto" : "max-h-[28rem] overflow-y-auto",
          )}
        >
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-xs text-fg-muted">
                <th className="px-3 py-2 font-semibold">Country</th>
                {compact ? null : (
                  <th className="px-3 py-2 font-semibold">P5</th>
                )}
                <th className="px-3 py-2 font-semibold">Hardness</th>
                {canEdit ? (
                  <>
                    <th className="px-3 py-2 font-semibold">Active</th>
                    <th className="px-3 py-2">
                      <span className="sr-only">Remove</span>
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sorted.map((portfolio) => (
                <tr
                  key={portfolio.id}
                  className={cn(
                    "border-b border-line last:border-0",
                    !portfolio.isActive && "opacity-50",
                  )}
                >
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium text-fg">{portfolio.countryName}</p>
                      {compact && portfolio.isP5 ? (
                        <Badge tone="warning" size="sm">
                          P5
                        </Badge>
                      ) : null}
                    </div>
                    {portfolio.notes && !compact ? (
                      <p className="text-xs text-fg-faint">{portfolio.notes}</p>
                    ) : null}
                  </td>
                  {compact ? null : (
                    <td className="px-3 py-2">
                      {portfolio.isP5 ? (
                        <Badge tone="warning" size="sm">
                          P5
                        </Badge>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        aria-label={`${portfolio.countryName} hardness`}
                        value={
                          hardnessDraft[portfolio.id] ?? String(portfolio.hardness)
                        }
                        className="h-8 min-h-8 w-14 px-2 text-center text-xs tabular-nums"
                        onChange={(e) =>
                          setHardnessDraft((current) => ({
                            ...current,
                            [portfolio.id]: e.target.value,
                          }))
                        }
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          setHardnessDraft((current) => {
                            const copy = { ...current };
                            delete copy[portfolio.id];
                            return copy;
                          });
                          if (
                            !Number.isFinite(next) ||
                            next === portfolio.hardness
                          ) {
                            return;
                          }
                          runAction(() =>
                            updatePortfolio(portfolio.id, { hardness: next }),
                          );
                        }}
                      />
                    ) : (
                      <span className="tabular-nums">{portfolio.hardness}</span>
                    )}
                  </td>
                  {canEdit ? (
                    <>
                      <td className="px-3 py-2">
                        <Switch
                          checked={portfolio.isActive}
                          label={`${portfolio.countryName} ${portfolio.isActive ? "active" : "inactive"}`}
                          onChange={(next) =>
                            runAction(() =>
                              updatePortfolio(portfolio.id, { isActive: next }),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          aria-label={`Remove ${portfolio.countryName}`}
                          onClick={() => setRemoveTarget(portfolio)}
                          className={cn(
                            "grid size-8 place-items-center rounded-sm text-fg-muted",
                            "hover:bg-surface-inset hover:text-fg",
                            "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
                          )}
                        >
                          <Close className="size-4" />
                        </button>
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remove from allotment list?"
        description={
          removeTarget
            ? `${removeTarget.countryName} will no longer be available to allot. If a delegate already holds this seat, it is deactivated instead.`
            : undefined
        }
        confirmLabel="Remove"
        tone="danger"
        loading={pending}
        onConfirm={() => {
          if (!removeTarget) return;
          const id = removeTarget.id;
          setRemoveTarget(null);
          runAction(() => removePortfolio(id));
        }}
      />
    </div>
  );
}
