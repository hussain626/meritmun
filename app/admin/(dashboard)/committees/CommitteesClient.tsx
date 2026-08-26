"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check } from "@/components/icons/Check";
import { CloudUpload } from "@/components/icons/CloudUpload";
import { Download } from "@/components/icons/Download";
import { Globe } from "@/components/icons/Globe";
import { Pencil } from "@/components/icons/Pencil";
import { Plus } from "@/components/icons/Plus";
import { Drawer } from "@/components/admin/Drawer";
import { PageHeader } from "@/components/admin/PageHeader";
import { PortfolioManager } from "@/components/admin/PortfolioManager";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { createCommittee } from "@/lib/admin/cms-actions";
import type {
  CommitteeAdminRecord,
  Portfolio,
} from "@/lib/admin/types";
import type { CommitteeType } from "@/lib/types";
import { cn, formatNumber, titleCase } from "@/lib/utils";

type CommitteesClientProps = {
  committees: CommitteeAdminRecord[];
  portfolios: Portfolio[];
};

const TYPE_LABEL: Record<CommitteeType, string> = {
  "general-assembly": "GA",
  specialised: "Specialized",
  crisis: "Crisis",
  press: "Press",
};

function typeTone(type: CommitteeType): "neutral" | "accent" | "brand" {
  if (type === "crisis") return "brand";
  if (type === "specialised") return "accent";
  return "neutral";
}

export function CommitteesClient({
  committees,
  portfolios,
}: CommitteesClientProps) {
  const [typeFilter, setTypeFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    committees[0]?.id ?? null,
  );
  const [tab, setTab] = useState("portfolios");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return committees.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (difficultyFilter && c.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [committees, typeFilter, difficultyFilter]);

  const selected =
    filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const selectedPortfolios = useMemo(() => {
    if (!selected) return [];
    return portfolios
      .filter((p) => p.committeeId === selected.id)
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  }, [portfolios, selected]);

  function exportCsv() {
    const header = "Name,Slug,Type,Difficulty,Seats,Published";
    const lines = filtered.map((c) =>
      [c.abbr, c.slug, c.type, c.difficulty, String(c.seats), String(c.isPublished)]
        .map((cell) => `"${cell.replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "meritmun-committees.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Committees"
        description="Manage conference committees, portfolios, and academic resources."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              iconStart={<Download className="size-4" />}
              onClick={exportCsv}
            >
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconStart={<Plus className="size-4" />}
              onClick={() => {
                setCreateStatus(null);
                setCreateOpen(true);
              }}
            >
              Create Committee
            </Button>
          </>
        }
      />

      {committees.length === 0 ? (
        <EmptyState
          title="No committees"
          body="Seed committees from content or create them in Supabase."
        />
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "All Types" },
                  { value: "general-assembly", label: "GA" },
                  { value: "specialised", label: "Specialized" },
                  { value: "crisis", label: "Crisis" },
                  { value: "press", label: "Press" },
                ]}
                className="min-h-9 w-40 text-sm"
              />
              <Select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                options={[
                  { value: "", label: "Any Difficulty" },
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ]}
                className="min-h-9 w-44 text-sm"
              />
              <p className="ml-auto text-sm text-fg-muted">
                Showing {filtered.length} of {committees.length}
              </p>
            </div>

            <div className="overflow-x-auto rounded-sm border border-line bg-surface shadow-sm">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead className="bg-surface-inset">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Name
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Slug
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Difficulty
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Seats
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-fg-muted">
                      Published
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const active = selected?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => {
                          setSelectedId(c.id);
                          setTab("portfolios");
                        }}
                        className={cn(
                          "cursor-pointer border-b border-line last:border-b-0",
                          "transition-colors duration-[var(--dur-fast)]",
                          active
                            ? "bg-admin-selected"
                            : "hover:bg-surface-inset",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Globe className="size-4 text-fg-faint" />
                            <span className="font-semibold text-fg">{c.abbr}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                          {c.slug}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={typeTone(c.type)}
                            size="sm"
                            className={cn(
                              "uppercase tracking-wide",
                              c.type === "crisis" && "bg-fg text-canvas",
                            )}
                          >
                            {TYPE_LABEL[c.type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          {titleCase(c.difficulty)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatNumber(c.seats)}
                        </td>
                        <td className="px-4 py-3">
                          {c.isPublished ? (
                            <span className="grid size-5 place-items-center rounded-full bg-success text-on-brand">
                              <Check className="size-3" />
                              <span className="sr-only">Published</span>
                            </span>
                          ) : (
                            <span className="size-5 rounded-full border border-line" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <aside className="w-full shrink-0 rounded-sm border border-line bg-surface p-4 shadow-sm xl:w-[22rem]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-fg">{selected.abbr}</h2>
                    <Badge
                      tone={selected.isPublished ? "accent" : "neutral"}
                      size="sm"
                    >
                      {selected.isPublished ? "Active" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-fg-muted">{selected.name}</p>
                </div>
                <Link
                  href={`/admin/committees/${selected.id}`}
                  aria-label={`Edit ${selected.abbr}`}
                  className={cn(
                    "grid size-8 place-items-center rounded-sm text-fg-muted",
                    "hover:bg-surface-inset hover:text-fg",
                    "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
                  )}
                >
                  <Pencil className="size-4" />
                </Link>
              </div>

              <Tabs
                tabs={[
                  { id: "portfolios", label: "Portfolios" },
                  { id: "academic", label: "Academic" },
                  { id: "settings", label: "Settings" },
                ]}
                value={tab}
                onChange={setTab}
                label="Committee detail"
                idBase="committee-detail"
                variant="underline"
                className="mt-4"
              />

              <TabPanel idBase="committee-detail" tabId="portfolios" className="mt-4">
                {tab === "portfolios" ? (
                  <PortfolioManager
                    committeeId={selected.id}
                    seats={selected.seats}
                    portfolios={selectedPortfolios}
                    canEdit
                    compact
                    defaultHardness={selected.hardnessScore}
                  />
                ) : null}
              </TabPanel>

              <TabPanel idBase="committee-detail" tabId="academic" className="mt-4">
                {tab === "academic" ? (
                  <div className="flex flex-col gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-fg-muted">Agenda</p>
                      <p className="mt-1 text-fg">{selected.agenda || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-fg-muted">Overview</p>
                      <p className="mt-1 line-clamp-6 text-fg-muted">
                        {selected.overview || "—"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </TabPanel>

              <TabPanel idBase="committee-detail" tabId="settings" className="mt-4">
                {tab === "settings" ? (
                  <dl className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Featured</dt>
                      <dd className="font-medium">{selected.featured ? "Yes" : "No"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Hardness</dt>
                      <dd className="font-medium tabular-nums">
                        {selected.hardnessScore}
                      </dd>
                    </div>
                    <Link
                      href={`/admin/committees/${selected.id}`}
                      className="mt-2 text-sm font-medium text-brand-fg"
                    >
                      Open full editor
                    </Link>
                  </dl>
                ) : null}
              </TabPanel>

              <div className="mt-5 flex flex-col items-center rounded-sm border border-dashed border-line px-3 py-5 text-center">
                <CloudUpload className="size-6 text-fg-faint" />
                <p className="mt-2 text-sm font-medium text-fg">
                  Upload Study Guide (PDF)
                </p>
                <p className="text-xs text-fg-faint">Max 10MB</p>
                {selected.studyGuideUrl ? (
                  <a
                    href={selected.studyGuideUrl}
                    className="mt-2 text-xs font-medium text-brand-fg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Current guide
                  </a>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create committee"
        footer={
          <Button
            type="submit"
            form="create-committee"
            variant="primary"
            size="sm"
            loading={pending}
            loadingLabel="Creating"
          >
            Create
          </Button>
        }
      >
        <form
          id="create-committee"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await createCommittee({
                name: String(form.get("name") ?? ""),
                abbr: String(form.get("abbr") ?? ""),
                type: String(form.get("type") ?? "") as CommitteeType,
                difficulty: String(
                  form.get("difficulty") ?? "",
                ) as CommitteeAdminRecord["difficulty"],
                agenda: String(form.get("agenda") ?? ""),
                seats: Number(form.get("seats") ?? 0),
              });
              setCreateStatus(result.message);
              if (result.ok) setCreateOpen(false);
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Name</span>
            <Input name="name" required placeholder="United Nations Security Council" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Abbreviation</span>
            <Input name="abbr" required placeholder="UNSC" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Type</span>
            <Select
              name="type"
              required
              options={[
                { value: "general-assembly", label: "General Assembly" },
                { value: "specialised", label: "Specialized" },
                { value: "crisis", label: "Crisis" },
                { value: "press", label: "Press" },
              ]}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Difficulty</span>
            <Select
              name="difficulty"
              required
              options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Seats</span>
            <Input name="seats" type="number" min={0} defaultValue={15} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-fg">Agenda</span>
            <Textarea name="agenda" rows={3} placeholder="The question of…" />
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
