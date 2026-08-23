import Link from "next/link";
import { ChairList } from "@/components/committees/ChairList";
import {
  difficultyLabel,
  difficultyTone,
  typeLabel,
} from "@/components/committees/CommitteeCard";
import { ArrowLeft } from "@/components/icons/ArrowLeft";
import { FileText } from "@/components/icons/FileText";
import { Users } from "@/components/icons/Users";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Prose } from "@/components/ui/Prose";
import { registrationOpen } from "@/content/site";
import type { Committee } from "@/lib/types";

type CommitteeDetailProps = {
  committee: Committee;
};

export function CommitteeDetail({ committee }: CommitteeDetailProps) {
  const guideUrl = committee.backgroundGuideUrl;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone="neutral">{typeLabel[committee.type]}</Badge>
        <Badge tone={difficultyTone[committee.difficulty]}>
          {difficultyLabel[committee.difficulty]}
        </Badge>
        <span className="flex items-center gap-1.5 text-sm text-fg-faint">
          <Users className="size-4" />
          {committee.seats} seats
        </span>
      </div>

      {/* One of the three sanctioned small-caps labels site-wide: it names the
          single statement the entire committee is organised around. */}
      <p className="mt-10 text-xs font-semibold tracking-caps text-brand-fg uppercase">
        Agenda
      </p>
      <p className="mt-3 max-w-[24ch] font-display text-h2 text-fg text-balance sm:max-w-[34ch]">
        {committee.agenda}
      </p>

      <div className="mt-14 grid gap-x-12 gap-y-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Prose>
            <p>{committee.overview}</p>
          </Prose>

          <h2 className="mt-12 text-h3 text-fg">What the committee argues</h2>
          <ul className="mt-5 max-w-[var(--measure)] list-disc space-y-3 pl-5 text-fg-muted marker:text-brand-fg">
            {committee.focusPoints.map((point) => (
              <li key={point} className="leading-relaxed">
                {point}
              </li>
            ))}
          </ul>
        </div>

        <aside className="lg:col-span-5">
          <h2 className="text-h3 text-fg">Chaired by</h2>
          <div className="mt-5">
            <ChairList chairs={committee.chairs} />
          </div>

          <h2 className="mt-12 text-h3 text-fg">Background guide</h2>
          <div className="mt-5">
            {guideUrl === null ? (
              <Alert tone="info">
                Guides are published after allocation, once every delegate knows
                which committee and country they are preparing for.
              </Alert>
            ) : (
              <ButtonLink
                href={guideUrl}
                variant="outline"
                external={guideUrl.startsWith("http")}
                iconStart={<FileText className="size-5" />}
              >
                Read the background guide
              </ButtonLink>
            )}
          </div>

          <div className="mt-12 rounded-md bg-surface-inset p-6">
            <p className="text-base leading-normal text-fg-muted">
              Delegates rank three committees at registration. Naming this one
              first gives it the strongest weighting in allocation.
            </p>
            <ButtonLink
              href={registrationOpen ? `/register/delegate?committee=${committee.slug}` : "/register"}
              className="mt-5"
            >
              {registrationOpen
                ? "Register for this committee"
                : "Registration coming soon"}
            </ButtonLink>
          </div>
        </aside>
      </div>

      <div className="mt-16 border-t border-line pt-8">
        <Link
          href="/committees"
          className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors duration-[var(--dur-fast)] ease-out hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          Back to all committees
        </Link>
      </div>
    </div>
  );
}
