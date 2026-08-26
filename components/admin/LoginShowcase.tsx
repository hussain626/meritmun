import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SystemSummitCredit } from "@/components/admin/SystemSummitCredit";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

const WORDS = [
  "allotments",
  "committees",
  "delegates",
  "the floor",
  "payments",
  "secretariat",
] as const;

const COMMITTEES = [
  { abbr: "UNSC", name: "Security Council", filled: 12, seats: 15 },
  { abbr: "DISEC", name: "Disarmament", filled: 18, seats: 30 },
  { abbr: "UNHRC", name: "Human Rights", filled: 22, seats: 47 },
] as const;

const ALLOTMENTS = [
  {
    name: "Ayesha Malik",
    seat: "UNSC · Iran",
    status: "confirmed" as const,
  },
  {
    name: "Bilal Hussain",
    seat: "UNSC · Pakistan",
    status: "draft" as const,
  },
];

function WordCycle() {
  const lines = [...WORDS, WORDS[0]];

  return (
    <span className="relative inline-block h-[1.15em] overflow-hidden align-bottom motion-reduce:overflow-visible">
      <span
        className={cn(
          "flex flex-col",
          "animate-login-words",
          "group-hover:[animation-play-state:paused]",
          "motion-reduce:animate-none",
        )}
      >
        {lines.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={cn(
              "flex h-[1.15em] items-center whitespace-nowrap leading-none",
              index > 0 && "motion-reduce:hidden",
            )}
          >
            {word}
          </span>
        ))}
      </span>
    </span>
  );
}

function SeatBar({ filled, seats }: { filled: number; seats: number }) {
  const percent = Math.round((filled / seats) * 100);
  return (
    <div className="h-1 overflow-hidden rounded-full bg-admin-rail">
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * Right-hand panel for the admin login. Headline, compact allotment preview,
 * and SystemSummit credit are locked to a single viewport.
 */
export function LoginShowcase() {
  const wordsLabel = WORDS.join(", ");

  return (
    <aside className="relative hidden h-dvh grid-rows-[auto_1fr_auto] overflow-hidden bg-admin-rail px-12 py-10 text-admin-rail-fg lg:grid">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 42% at 18% 8%, color-mix(in oklch, var(--brand) 48%, transparent), transparent 62%)",
        }}
      />

      <div className="relative z-10 flex justify-end">
        <ThemeToggle className="size-9 text-admin-rail-muted hover:bg-admin-rail-hover hover:text-admin-rail-fg" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-col justify-center">
        <div className="group mx-auto flex w-full max-w-[22rem] flex-col gap-5">
          <div>
            <h2 className="sr-only">Built for {wordsLabel}</h2>
            <p
              aria-hidden="true"
              className="flex items-baseline gap-x-3 font-display text-[2rem] font-bold leading-none tracking-tight text-on-art"
            >
              <span>Built for</span>
              <span className="text-accent">
                <WordCycle />
              </span>
            </p>
          </div>

          <div
            className="rounded-md border border-admin-rail-faint bg-admin-rail-hover/70 p-3.5 shadow-md"
            aria-hidden="true"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-on-art">Allotment desk</p>
              <p className="text-xs text-admin-rail-muted">MERITMUN III</p>
            </div>

            <dl className="mt-2.5 grid grid-cols-3 gap-1.5">
              {[
                ["Registered", "248"],
                ["Paid", "186"],
                ["Allotted", "172"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-sm bg-admin-rail px-2 py-1.5"
                >
                  <dt className="text-[0.625rem] font-medium text-admin-rail-faint">
                    {label}
                  </dt>
                  <dd className="text-sm font-bold tabular-nums text-on-art">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="mt-2.5 flex flex-col gap-1.5">
              {COMMITTEES.map((committee) => (
                <li key={committee.abbr}>
                  <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-on-art">
                      {committee.abbr}
                      <span className="ml-1.5 font-normal text-admin-rail-muted">
                        {committee.name}
                      </span>
                    </span>
                    <span className="tabular-nums text-admin-rail-muted">
                      {committee.filled}/{committee.seats}
                    </span>
                  </div>
                  <SeatBar filled={committee.filled} seats={committee.seats} />
                </li>
              ))}
            </ul>

            <ul className="mt-2.5 divide-y divide-admin-rail-faint border-t border-admin-rail-faint">
              {ALLOTMENTS.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-on-art">
                      {row.name}
                    </p>
                    <p className="truncate text-xs text-admin-rail-muted">
                      {row.seat}
                    </p>
                  </div>
                  <StatusBadge kind="allotment" status={row.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-4 text-admin-rail-muted">
        <SystemSummitCredit />
      </div>
    </aside>
  );
}
