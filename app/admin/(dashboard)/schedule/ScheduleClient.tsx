"use client";

import { useState, useTransition } from "react";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { Plus } from "@/components/icons/Plus";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createScheduleDay,
  createScheduleItem,
  deleteScheduleDay,
  deleteScheduleItem,
  updateScheduleDay,
  updateScheduleItem,
} from "@/lib/admin/cms-actions";
import type { ScheduleDayRecord, ScheduleItemRecord } from "@/lib/admin/types";
import type { ScheduleKind } from "@/lib/types";

type ScheduleClientProps = {
  days: ScheduleDayRecord[];
};

const KIND_OPTIONS = [
  { value: "session", label: "Committee session" },
  { value: "ceremony", label: "Ceremony" },
  { value: "break", label: "Break" },
  { value: "social", label: "Social" },
  { value: "logistics", label: "Logistics" },
];

export function ScheduleClient({ days }: ScheduleClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(days[0]?.id ?? null);
  const [dayOpen, setDayOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItemRecord | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = days.find((d) => d.id === selectedId) ?? days[0] ?? null;

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setStatus(result.message);
      if (result.ok) {
        setDayOpen(false);
        setItemOpen(false);
        setEditingItem(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Schedule"
        description="Days, session times, and venues shown on the public schedule page."
        actions={
          <Button
            variant="secondary"
            size="sm"
            iconStart={<Plus className="size-4" />}
            onClick={() => setDayOpen(true)}
          >
            Add day
          </Button>
        }
      />

      {status ? (
        <p className="text-sm text-fg-muted" role="status">
          {status}
        </p>
      ) : null}

      {days.length === 0 ? (
        <EmptyState
          title="No schedule days"
          body="Add Day One, then sessions with start and end times. They appear on /schedule."
          action={
            <Button variant="primary" size="sm" onClick={() => setDayOpen(true)}>
              Add day
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <ul className="flex flex-col gap-2 xl:w-64">
            {days.map((day) => {
              const active = selected?.id === day.id;
              return (
                <li key={day.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(day.id)}
                    className={`w-full rounded-sm border px-3 py-2.5 text-left text-sm ${
                      active
                        ? "border-brand bg-admin-selected"
                        : "border-line bg-surface hover:bg-surface-inset"
                    }`}
                  >
                    <p className="font-semibold text-fg">{day.label}</p>
                    <p className="mt-0.5 text-xs text-fg-faint">
                      {day.items.length}{" "}
                      {day.items.length === 1 ? "session" : "sessions"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <section className="min-w-0 flex-1 rounded-sm border border-line bg-surface p-4 shadow-sm">
              <form
                className="grid gap-3 sm:grid-cols-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  run(() =>
                    updateScheduleDay(selected.id, {
                      label: String(form.get("label") ?? ""),
                      theme: String(form.get("theme") ?? ""),
                      date: String(form.get("date") ?? ""),
                    }),
                  );
                }}
              >
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
                  <span className="font-medium text-fg">Label</span>
                  <Input name="label" defaultValue={selected.label} required />
                </label>
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
                  <span className="font-medium text-fg">Date</span>
                  <Input name="date" type="date" defaultValue={selected.date ?? ""} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
                  <span className="font-medium text-fg">Theme</span>
                  <Input name="theme" defaultValue={selected.theme} />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-3">
                  <Button type="submit" variant="secondary" size="sm" loading={pending}>
                    Save day
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      run(() => deleteScheduleDay(selected.id));
                    }}
                  >
                    Remove day
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    iconStart={<Plus className="size-4" />}
                    onClick={() => {
                      setEditingItem(null);
                      setItemOpen(true);
                    }}
                  >
                    Add session
                  </Button>
                </div>
              </form>

              <ul className="mt-5 flex flex-col divide-y divide-line border-t border-line">
                {selected.items.length === 0 ? (
                  <li className="py-6 text-sm text-fg-muted">
                    No sessions on this day yet.
                  </li>
                ) : (
                  selected.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-xs tabular-nums text-fg-faint">
                          {item.start} – {item.end} · {item.kind}
                        </p>
                        <p className="font-semibold text-fg">{item.title}</p>
                        <p className="text-sm text-fg-muted">{item.venue || "—"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setItemOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            run(() => deleteScheduleItem(item.id));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <Drawer
        open={dayOpen}
        onClose={() => setDayOpen(false)}
        title="Add day"
        footer={
          <Button
            type="submit"
            form="create-day"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Adding"
          >
            Add day
          </Button>
        }
      >
        <form
          id="create-day"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(() =>
              createScheduleDay({
                label: String(form.get("label") ?? ""),
                theme: String(form.get("theme") ?? ""),
                date: String(form.get("date") ?? ""),
              }),
            );
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Label</span>
            <Input name="label" required placeholder="Day One" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Date</span>
            <Input name="date" type="date" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Theme</span>
            <Input name="theme" placeholder="Opening and first committee sessions" />
          </label>
        </form>
      </Drawer>

      <Drawer
        open={itemOpen}
        onClose={() => {
          setItemOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit session" : "Add session"}
        footer={
          <Button
            type="submit"
            form="schedule-item"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Saving"
          >
            {editingItem ? "Save session" : "Add session"}
          </Button>
        }
      >
        {selected ? (
          <form
            id="schedule-item"
            key={editingItem?.id ?? "new"}
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const payload = {
                start: String(form.get("start") ?? ""),
                end: String(form.get("end") ?? ""),
                title: String(form.get("title") ?? ""),
                kind: String(form.get("kind") ?? "session") as ScheduleKind,
                venue: String(form.get("venue") ?? ""),
                description: String(form.get("description") ?? ""),
              };
              if (editingItem) {
                run(() => updateScheduleItem(editingItem.id, payload));
              } else {
                run(() =>
                  createScheduleItem({ dayId: selected.id, ...payload }),
                );
              }
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg">Starts</span>
                <Input
                  name="start"
                  type="time"
                  required
                  defaultValue={editingItem?.start ?? "09:00"}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-fg">Ends</span>
                <Input
                  name="end"
                  type="time"
                  required
                  defaultValue={editingItem?.end ?? "11:00"}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">Title</span>
              <Input
                name="title"
                required
                defaultValue={editingItem?.title ?? ""}
                placeholder="Committee Session I"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">Type</span>
              <Select
                name="kind"
                defaultValue={editingItem?.kind ?? "session"}
                options={KIND_OPTIONS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">Venue</span>
              <Input
                name="venue"
                defaultValue={editingItem?.venue ?? ""}
                placeholder="Allocated committee rooms"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-fg">Description</span>
              <Textarea
                name="description"
                rows={3}
                defaultValue={editingItem?.description ?? ""}
              />
            </label>
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
