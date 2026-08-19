import Link from "next/link";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { Users } from "@/components/icons/Users";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Committee, CommitteeType, Difficulty } from "@/lib/types";

export const difficultyTone = {
  beginner: "success",
  intermediate: "brand",
  advanced: "warning",
} as const;

export const difficultyLabel: Record<Difficulty, string> = {
  beginner: "Beginner friendly",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const typeLabel: Record<CommitteeType, string> = {
  "general-assembly": "General Assembly",
  specialised: "Specialised",
  crisis: "Crisis",
  press: "Press",
};

type CommitteeCardProps = {
  committee: Committee;
  className?: string;
};

export function CommitteeCard({ committee, className }: CommitteeCardProps) {
  return (
    <Card
      interactive
      padding="none"
      className={cn("group/card overflow-hidden", className)}
    >
      {/* The whole card is the link, with a real accessible name — not a
          "read more" affordance with a handler on the parent. */}
      <Link
        href={`/committees/${committee.slug}`}
        className="flex h-full flex-col p-5 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-display text-h3 leading-none font-bold tracking-tight text-brand-fg">
            {committee.abbr}
          </span>
          <Badge tone={difficultyTone[committee.difficulty]} size="sm">
            {difficultyLabel[committee.difficulty]}
          </Badge>
        </div>

        <h3 className="mt-3 text-base leading-snug font-semibold text-fg text-balance">
          {committee.name}
        </h3>

        <p className="mt-2.5 flex-1 text-sm leading-normal text-fg-muted">
          {committee.agenda}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="flex items-center gap-3 text-xs text-fg-faint">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {committee.seats} seats
            </span>
            <span>{typeLabel[committee.type]}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-fg-faint transition-transform duration-[var(--dur-fast)] ease-out group-hover/card:translate-x-0.5 group-hover/card:text-accent-fg" />
        </div>
      </Link>
    </Card>
  );
}
