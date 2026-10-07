"use client";

import { useState } from "react";
import {
  CommitteeCard,
  difficultyLabel,
  typeLabel,
} from "@/components/committees/CommitteeCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, pluralise } from "@/lib/utils";
import type { Committee, CommitteeType, Difficulty } from "@/lib/types";

type TypeFilter = CommitteeType | "all";
type DifficultyFilter = Difficulty | "all";

const TYPE_OPTIONS: TypeFilter[] = [
  "all",
  "general-assembly",
  "specialised",
  "crisis",
  "press",
];

const DIFFICULTY_OPTIONS: DifficultyFilter[] = [
  "all",
  "beginner",
  "intermediate",
  "advanced",
];

const TYPE_FILTER_LABEL: Record<TypeFilter, string> = {
  all: "All committees",
  ...typeLabel,
};

const DIFFICULTY_FILTER_LABEL: Record<DifficultyFilter, string> = {
  all: "All levels",
  ...difficultyLabel,
};

const pillBase = cn(
  "inline-flex min-h-10 items-center rounded-full border px-4",
  "text-sm font-semibold tracking-tight",
  "transition-[background-color,border-color,color] duration-[var(--dur-fast)] ease-out",
  "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
);

// Transparent rather than absent, so selecting a pill never shifts the row by 1px.
const pillSelected = "border-transparent bg-brand text-on-brand";
const pillUnselected =
  "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg";

type CommitteeFiltersProps = {
  committees: Committee[];
};

export function CommitteeFilters({ committees }: CommitteeFiltersProps) {
  const [type, setType] = useState<TypeFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");

  const visible = committees.filter(
    (committee) =>
      (type === "all" || committee.type === type) &&
      (difficulty === "all" || committee.difficulty === difficulty),
  );

  const isFiltered = type !== "all" || difficulty !== "all";

  function handleClear() {
    setType("all");
    setDifficulty("all");
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <p
            id="committee-type-label"
            className="text-sm font-semibold text-fg sm:w-20 sm:shrink-0"
          >
            Type
          </p>
          <div
            role="group"
            aria-labelledby="committee-type-label"
            className="flex flex-wrap gap-2"
          >
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={type === option}
                onClick={() => setType(option)}
                className={cn(
                  pillBase,
                  type === option ? pillSelected : pillUnselected,
                )}
              >
                {TYPE_FILTER_LABEL[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <p
            id="committee-difficulty-label"
            className="text-sm font-semibold text-fg sm:w-20 sm:shrink-0"
          >
            Level
          </p>
          <div
            role="group"
            aria-labelledby="committee-difficulty-label"
            className="flex flex-wrap gap-2"
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={difficulty === option}
                onClick={() => setDifficulty(option)}
                className={cn(
                  pillBase,
                  difficulty === option ? pillSelected : pillUnselected,
                )}
              >
                {DIFFICULTY_FILTER_LABEL[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p aria-live="polite" className="text-sm text-fg-muted">
          Showing {visible.length} of {committees.length}{" "}
          {pluralise(committees.length, "committee", "committees")}
        </p>
        {isFiltered ? (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No committees match those filters"
          body="Every committee is either a different type or a different level from the pair you picked. Clear the filters to see them all."
          action={
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((committee) => (
            <CommitteeCard key={committee.slug} committee={committee} />
          ))}
        </div>
      )}
    </div>
  );
}
