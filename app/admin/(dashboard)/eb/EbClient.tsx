"use client";

import { useMemo, useState, useTransition } from "react";
import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { GripVertical } from "@/components/icons/GripVertical";
import { Plus } from "@/components/icons/Plus";
import { Drawer } from "@/components/admin/Drawer";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { Switch } from "@/components/admin/Switch";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { createEbMember, setEbMemberPublished } from "@/lib/admin/cms-actions";
import type { EbMemberRecord } from "@/lib/admin/types";

type EbClientProps = {
  members: EbMemberRecord[];
};

const PAGE_SIZE = 8;

export function EbClient({ members }: EbClientProps) {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (status === "published") return m.isPublished;
      if (status === "hidden") return !m.isPublished;
      return true;
    });
  }, [members, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Executive Board"
        description="Manage committee chairs, vice-chairs, and directors."
        actions={
          <Button
            variant="primary"
            size="sm"
            iconStart={<Plus className="size-4" />}
            onClick={() => {
              setCreateStatus(null);
              setCreateOpen(true);
            }}
          >
            Add Member
          </Button>
        }
      />

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
                  Order
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Member
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-fg-muted">
                  Committee & Role
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
              {paged.map((member) => (
                <tr key={member.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 text-fg-faint">
                    <GripVertical className="size-4" />
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
                    <p className="text-xs text-fg-muted">Executive Board</p>
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
                      onChange={(next) => {
                        startTransition(async () => {
                          await setEbMemberPublished(member.id, next);
                        });
                      }}
                    />
                  </td>
                  <td className="px-3 py-3" />
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
            noun="members"
          />
        </div>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add EB member"
        footer={
          <Button
            type="submit"
            form="create-eb"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Adding"
          >
            Add member
          </Button>
        }
      >
        <form
          id="create-eb"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await createEbMember({
                name: String(form.get("name") ?? ""),
                role: String(form.get("role") ?? ""),
                bio: String(form.get("bio") ?? ""),
                email: String(form.get("email") ?? ""),
              });
              setCreateStatus(result.message);
              if (result.ok) setCreateOpen(false);
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Name</span>
            <Input name="name" required placeholder="Ayesha Malik" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Role</span>
            <Input name="role" required placeholder="Secretary-General" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Email</span>
            <Input name="email" type="email" placeholder="sg@meritmun.org" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Bio</span>
            <Textarea name="bio" rows={4} />
          </label>
          {createStatus ? (
            <p className="text-sm text-fg-muted" role="status">
              {createStatus}
            </p>
          ) : null}
        </form>
      </Drawer>
    </div>
  );
}
