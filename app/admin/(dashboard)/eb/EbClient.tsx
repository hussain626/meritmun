"use client";

import { useMemo, useState, useTransition } from "react";
import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { Plus } from "@/components/icons/Plus";
import { BoardMemberEditor } from "@/components/admin/BoardMemberEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { RowControls } from "@/components/admin/RowControls";
import { Switch } from "@/components/admin/Switch";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  deleteBoardMember,
  moveBoardMember,
  setEbMemberPublished,
} from "@/lib/admin/cms-actions";
import type { EbMemberRecord } from "@/lib/admin/types";

type EbClientProps = {
  members: EbMemberRecord[];
};

const PAGE_SIZE = 8;

export function EbClient({ members }: EbClientProps) {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EbMemberRecord | null>(null);
  const [deleting, setDeleting] = useState<EbMemberRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ordered = useMemo(
    () => [...members].sort((a, b) => a.sortOrder - b.sortOrder),
    [members],
  );

  const filtered = useMemo(() => {
    return ordered.filter((m) => {
      if (status === "published") return m.isPublished;
      if (status === "hidden") return !m.isPublished;
      return true;
    });
  }, [ordered, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Executive Board"
        description="The secretariat shown on the public Executive Board page, in this order."
        actions={
          <Button
            variant="primary"
            size="sm"
            iconStart={<Plus className="size-4" />}
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            Add Member
          </Button>
        }
      />

      {message ? (
        <p className="text-sm text-fg-muted" role="status">
          {message}
        </p>
      ) : null}

      <FilterBar>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          Status:
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "published", label: "Published" },
              { value: "hidden", label: "Hidden" },
            ]}
            className="min-h-9 w-40 text-sm"
          />
        </label>
      </FilterBar>

      {members.length === 0 ? (
        <EmptyState
          title="No EB members"
          body="Add board members to publish them on the public site."
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="bg-surface-inset">
              <tr className="border-b border-line">
                <th className="w-12 px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Member
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Role
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Bio Snippet
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Published
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((member) => {
                const position = ordered.indexOf(member);
                return (
                  <tr key={member.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-3 tabular-nums text-fg-faint">
                      {position + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        {member.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.photoUrl}
                            alt=""
                            className="size-10 rounded-sm object-cover"
                          />
                        ) : (
                          <InitialsMedallion
                            initials={member.initials}
                            size="sm"
                            className="rounded-sm"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-fg">{member.name}</p>
                          <p className="text-xs text-fg-faint">
                            {member.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-fg">{member.role}</p>
                    </td>
                    <td className="max-w-[18rem] px-3 py-3">
                      <p className="line-clamp-2 text-sm text-fg-muted">
                        {member.bio}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Switch
                        checked={member.isPublished}
                        label={`${member.name} published`}
                        disabled={pending}
                        onChange={(next) =>
                          run(() => setEbMemberPublished(member.id, next))
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <RowControls
                        label={member.name}
                        disabled={pending}
                        onEdit={() => {
                          setEditing(member);
                          setEditorOpen(true);
                        }}
                        onMoveUp={
                          position > 0
                            ? () => run(() => moveBoardMember("eb", member.id, -1))
                            : undefined
                        }
                        onMoveDown={
                          position < ordered.length - 1
                            ? () => run(() => moveBoardMember("eb", member.id, 1))
                            : undefined
                        }
                        onDelete={() => setDeleting(member)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun="members"
          />
        </div>
      )}

      <BoardMemberEditor
        key={editing?.id ?? "new"}
        kind="eb"
        open={editorOpen}
        member={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={(text) => {
          setMessage(text);
          setEditorOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const id = deleting.id;
          startTransition(async () => {
            const result = await deleteBoardMember("eb", id);
            setMessage(result.message);
            setDeleting(null);
          });
        }}
        title={`Remove ${deleting?.name ?? "this member"}?`}
        description="They disappear from the public Executive Board page. To hide someone temporarily, switch Published off instead."
        confirmLabel="Remove"
        tone="danger"
        loading={pending}
      />
    </div>
  );
}
