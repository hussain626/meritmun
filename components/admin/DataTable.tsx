"use client";

import {
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Search } from "@/components/icons/Search";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  /** Prefer narrower columns (actions, badges). */
  align?: "left" | "right";
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchableKeys?: (keyof T)[];
  searchPlaceholder?: string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  toolbar?: ReactNode;
};

function cellValue(row: Record<string, unknown>, key: string): ReactNode {
  const value = row[key];
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number") return value;
  return String(value);
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  searchableKeys,
  searchPlaceholder = "Search…",
  emptyState,
  onRowClick,
  className,
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q || !searchableKeys?.length) return rows;

    return rows.filter((row) =>
      searchableKeys.some((key) => {
        const raw = row[key];
        if (raw == null) return false;
        return String(raw).toLowerCase().includes(q);
      }),
    );
  }, [rows, deferredQuery, searchableKeys]);

  const showSearch = Boolean(searchableKeys?.length);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showSearch || toolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {showSearch ? (
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="min-h-9 pl-9 text-sm"
              />
            </div>
          ) : null}
          {toolbar}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        (emptyState ?? (
          <p className="rounded-md border border-dashed border-line px-4 py-10 text-center text-sm text-fg-muted">
            No rows to show.
          </p>
        ))
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-fg-muted",
                      col.align === "right" && "text-right",
                      col.className,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-line last:border-b-0",
                      "transition-colors duration-[var(--dur-fast)] ease-out",
                      onRowClick &&
                        "cursor-pointer hover:bg-surface-inset focus-within:bg-surface-inset",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-fg",
                          col.align === "right" && "text-right",
                          col.className,
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : cellValue(row, col.key)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
