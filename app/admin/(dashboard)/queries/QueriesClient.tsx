"use client";

import { useMemo, useState, useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { replyToQuery } from "@/lib/admin/actions";
import type { AdminRole, QueryRecord } from "@/lib/admin/types";
import { cn, titleCase } from "@/lib/utils";

type QueriesClientProps = {
  queries: QueryRecord[];
  role: AdminRole;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function QueriesClient({ queries, role }: QueriesClientProps) {
  const canReply = role === "admin" || role === "eb";
  const [statusFilter, setStatusFilter] = useState("open");
  const [selected, setSelected] = useState<QueryRecord | null>(null);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!statusFilter) return queries;
    return queries.filter((q) => q.status === statusFilter);
  }, [queries, statusFilter]);

  const columns: DataTableColumn<QueryRecord & Record<string, unknown>>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <div>
          <p className="font-medium text-fg">{row.subject}</p>
          <p className="text-xs text-fg-faint">
            {row.name} · {row.email}
          </p>
        </div>
      ),
    },
    {
      key: "topic",
      header: "Topic",
      render: (row) => titleCase(row.topic.replace(/_/g, " ")),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge kind="query" status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Received",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Queries"
        description="Reply to contact-form messages. Open items need a response."
      />

      {message ? (
        <p
          role="status"
          className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-fg-muted"
        >
          {message}
        </p>
      ) : null}

      <FilterBar>
        <div className="flex gap-1 rounded-sm border border-line bg-surface-inset p-1">
          {(
            [
              ["open", "Open"],
              ["answered", "Answered"],
              ["archived", "Archived"],
              ["", "All"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id || "all"}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--dur-fast)]",
                statusFilter === id
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex min-w-[10rem] flex-col gap-1 sm:ml-auto">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-fg-faint">
            Jump status
          </span>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "open", label: "Open" },
              { value: "answered", label: "Answered" },
              { value: "archived", label: "Archived" },
              { value: "", label: "All" },
            ]}
            className="min-h-9 text-sm"
          />
        </label>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filtered as (QueryRecord & Record<string, unknown>)[]}
        rowKey={(row) => row.id}
        searchableKeys={["subject", "name", "email", "message"]}
        searchPlaceholder="Search inbox…"
        onRowClick={(row) => {
          setSelected(row);
          setReply(row.replyBody ?? "");
        }}
        emptyState={
          <EmptyState
            title="Inbox clear"
            body="No queries in this filter. New contact submissions land here as open."
          />
        }
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.subject ?? "Query"}
        size="lg"
        footer={
          selected && canReply && selected.status === "open" ? (
            <Button
              variant="primary"
              size="sm"
              disabled={pending || !reply.trim()}
              loading={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await replyToQuery(selected.id, reply);
                  setMessage(result.message);
                  if (result.ok) setSelected(null);
                });
              }}
            >
              Send reply
            </Button>
          ) : undefined
        }
      >
        {selected ? (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="query" status={selected.status} />
              <span className="text-fg-faint">
                {titleCase(selected.topic)} · {formatDate(selected.createdAt)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                From
              </p>
              <p className="mt-1 text-fg">
                {selected.name}{" "}
                <span className="text-fg-muted">&lt;{selected.email}&gt;</span>
              </p>
            </div>
            <div className="rounded-md border border-line bg-surface-inset p-3 whitespace-pre-wrap text-fg">
              {selected.message}
            </div>
            {selected.status === "answered" && selected.replyBody ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                  Your reply
                </p>
                <p className="mt-1 whitespace-pre-wrap text-fg">
                  {selected.replyBody}
                </p>
              </div>
            ) : canReply ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                  Reply
                </span>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={6}
                  placeholder="Write a reply to send via email…"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
