"use client";

import { useState, useTransition } from "react";
import { Drawer } from "@/components/admin/Drawer";
import { Switch } from "@/components/admin/Switch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { saveBoardMember, type BoardKind } from "@/lib/admin/cms-actions";
import type { EbMemberRecord, HodRecord } from "@/lib/admin/types";

type BoardMemberEditorProps = {
  kind: BoardKind;
  open: boolean;
  /** Null creates a new member. */
  member: EbMemberRecord | HodRecord | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const NOUN: Record<BoardKind, string> = { eb: "EB member", hod: "HOD" };

/** Create / edit drawer shared by the EB and HOD lists. */
export function BoardMemberEditor({
  kind,
  open,
  member,
  onClose,
  onSaved,
}: BoardMemberEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(member?.isPublished ?? true);
  const [pending, startTransition] = useTransition();
  const formId = `board-${kind}-${member?.id ?? "new"}`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={member ? `Edit ${member.name}` : `Add ${NOUN[kind]}`}
      footer={
        <Button
          type="submit"
          form={formId}
          variant="primary"
          size="sm"
          loading={pending}
          loadingLabel="Saving"
        >
          {member ? "Save changes" : `Add ${NOUN[kind]}`}
        </Button>
      }
    >
      <form
        id={formId}
        // Remount per member so defaultValues reset when switching rows.
        key={formId}
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await saveBoardMember(kind, {
              id: member?.id,
              name: String(form.get("name") ?? ""),
              role: String(form.get("role") ?? ""),
              bio: String(form.get("bio") ?? ""),
              email: String(form.get("email") ?? ""),
              photoUrl: String(form.get("photoUrl") ?? ""),
              isPublished: published,
            });
            if (result.ok) onSaved(result.message);
            else setError(result.message);
          });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg">Name</span>
          <Input name="name" required defaultValue={member?.name ?? ""} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg">Role</span>
          <Input
            name="role"
            required
            defaultValue={member?.role ?? ""}
            placeholder={kind === "eb" ? "Secretary-General" : "Director of Logistics"}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg">Email</span>
          <Input name="email" type="email" defaultValue={member?.email ?? ""} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg">Photo link</span>
          <Input
            name="photoUrl"
            type="url"
            defaultValue={member?.photoUrl ?? ""}
            placeholder="https://…/portrait.jpg"
          />
          <span className="text-xs text-fg-faint">
            Optional. Without a photo the site shows the member&apos;s initials.
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-fg">Bio</span>
          <Textarea name="bio" rows={4} defaultValue={member?.bio ?? ""} />
        </label>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-fg">Shown on the public site</span>
          <Switch
            checked={published}
            label="Shown on the public site"
            onChange={setPublished}
          />
        </div>
        {error ? (
          <p className="text-sm text-danger-fg" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}
