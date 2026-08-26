"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/admin/Switch";
import { FileText } from "@/components/icons/FileText";
import { setRegistrationOpen } from "@/lib/admin/cms-actions";

type RegistrationGateCardProps = {
  open: boolean;
  canEdit: boolean;
};

export function RegistrationGateCard({
  open,
  canEdit,
}: RegistrationGateCardProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <FileText className="mt-0.5 size-4 shrink-0 text-fg-muted" />
          <div>
            <h2 className="text-sm font-semibold text-fg">Public registration</h2>
            <p className="mt-0.5 text-xs text-fg-faint">
              When closed, the public site shows “coming soon” and the forms are
              hidden. Status lookup stays live.
            </p>
          </div>
        </div>
        <Switch
          checked={isOpen}
          disabled={!canEdit || pending}
          label="Accept public registrations"
          onChange={
            canEdit
              ? (next) => {
                  setIsOpen(next);
                  startTransition(async () => {
                    const result = await setRegistrationOpen(next);
                    setStatus(result.message);
                    if (!result.ok) setIsOpen(!next);
                  });
                }
              : undefined
          }
        />
      </div>
      <p className="mt-3 text-sm font-medium text-fg">
        {isOpen ? "Registration is open." : "Registration is closed."}
      </p>
      {status ? (
        <p className="mt-1 text-xs text-fg-muted" role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
