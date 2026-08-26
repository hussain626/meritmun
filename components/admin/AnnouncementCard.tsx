"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/admin/Switch";
import { Megaphone } from "@/components/icons/Megaphone";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ANNOUNCEMENT_MESSAGE_MAX,
  type AnnouncementLinkType,
  type AnnouncementPageOption,
  type AnnouncementSettings,
} from "@/lib/admin/announcement";
import { saveAnnouncement } from "@/lib/admin/actions";

type AnnouncementCardProps = {
  announcement: AnnouncementSettings;
  pages: AnnouncementPageOption[];
  canEdit: boolean;
};

export function AnnouncementCard({
  announcement,
  pages,
  canEdit,
}: AnnouncementCardProps) {
  const [isActive, setIsActive] = useState(announcement.isActive);
  const [message, setMessage] = useState(announcement.message);
  const [linkType, setLinkType] = useState<AnnouncementLinkType>(
    announcement.linkType,
  );
  const [internalPath, setInternalPath] = useState(
    announcement.internalPath ?? pages[0]?.path ?? "/",
  );
  const [externalUrl, setExternalUrl] = useState(
    announcement.externalUrl ?? "",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-sm border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Megaphone className="mt-0.5 size-4 shrink-0 text-fg-muted" />
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Homepage announcement
            </h2>
            <p className="mt-0.5 text-xs text-fg-faint">
              Scrolls above the public header. Link it to a site page or an
              external URL.
            </p>
          </div>
        </div>
        <Switch
          checked={isActive}
          disabled={!canEdit}
          label="Show announcement bar"
          onChange={canEdit ? setIsActive : undefined}
        />
      </div>

      <form
        className="mt-4 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canEdit) return;
          startTransition(async () => {
            const result = await saveAnnouncement({
              isActive,
              message,
              linkType,
              internalPath: linkType === "internal" ? internalPath : null,
              externalUrl: linkType === "external" ? externalUrl : null,
            });
            setStatus(result.message);
          });
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
            Message
          </span>
          <Input
            value={message}
            maxLength={ANNOUNCEMENT_MESSAGE_MAX}
            disabled={!canEdit}
            placeholder="Study guides are now available for every committee."
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-9 text-sm"
          />
          <span className="text-xs text-fg-faint">
            {message.length}/{ANNOUNCEMENT_MESSAGE_MAX}
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
              Link
            </span>
            <Select
              value={linkType}
              disabled={!canEdit}
              className="min-h-9 text-sm"
              onChange={(e) =>
                setLinkType(e.target.value as AnnouncementLinkType)
              }
              options={[
                { value: "none", label: "No link" },
                { value: "internal", label: "Page on this site" },
                { value: "external", label: "External URL" },
              ]}
            />
          </label>

          {linkType === "internal" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Site page
              </span>
              <Select
                value={internalPath}
                disabled={!canEdit}
                className="min-h-9 text-sm"
                onChange={(e) => setInternalPath(e.target.value)}
                options={pages.map((page) => ({
                  value: page.path,
                  label: page.label,
                }))}
              />
            </label>
          ) : null}

          {linkType === "external" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                External URL
              </span>
              <Input
                type="url"
                value={externalUrl}
                disabled={!canEdit}
                placeholder="https://example.com"
                onChange={(e) => setExternalUrl(e.target.value)}
                className="min-h-9 text-sm"
              />
            </label>
          ) : null}
        </div>

        {canEdit ? (
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={pending}
            className="self-start"
          >
            Save announcement
          </Button>
        ) : (
          <p className="text-xs text-fg-faint">
            Only admin and EB can change the announcement.
          </p>
        )}

        {status ? (
          <p
            role="status"
            className="rounded-sm border border-line bg-surface-inset px-3 py-2 text-sm text-fg-muted"
          >
            {status}
          </p>
        ) : null}
      </form>
    </section>
  );
}
