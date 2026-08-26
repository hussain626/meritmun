import Link from "next/link";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { ExternalLink } from "@/components/icons/ExternalLink";
import { cn } from "@/lib/utils";

type AnnouncementBarProps = {
  message: string;
  href: string | null;
  external?: boolean;
};

function Diamond() {
  return (
    <span
      aria-hidden="true"
      className="size-1.5 shrink-0 rotate-45 bg-accent/70"
    />
  );
}

function TickerTrack({ message }: { message: string }) {
  const copies = (lane: string) =>
    Array.from({ length: 6 }, (_, index) => (
      <span
        key={`${lane}-${index}`}
        className="inline-flex items-center gap-5 pr-10"
      >
        <span>{message}</span>
        <Diamond />
      </span>
    ));

  return (
    <span
      className={cn(
        "inline-flex w-max items-center",
        "animate-announce-marquee",
        "group-hover:[animation-play-state:paused]",
        "group-focus-within:[animation-play-state:paused]",
      )}
    >
      <span className="inline-flex items-center">{copies("a")}</span>
      <span aria-hidden="true" className="inline-flex items-center">
        {copies("b")}
      </span>
    </span>
  );
}

function BarInner({
  message,
  href,
  external,
}: AnnouncementBarProps) {
  return (
    <div className="container-page flex h-full items-center gap-3 sm:gap-4">
      <p className="flex shrink-0 items-center gap-2">
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="text-[0.6875rem] font-semibold uppercase tracking-caps text-accent">
          Notice
        </span>
      </p>

      <span
        aria-hidden="true"
        className="hidden h-3.5 w-px shrink-0 bg-on-art/18 sm:block"
      />

      <div className="min-w-0 flex-1">
        <p className="sr-only">{message}</p>
        <p
          aria-hidden="true"
          className="hidden truncate text-sm font-medium text-on-art-muted motion-reduce:block"
        >
          {message}
        </p>
        <div
          aria-hidden="true"
          className={cn(
            "relative overflow-hidden motion-reduce:hidden",
            "[mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.5rem),transparent)]",
          )}
        >
          <p className="whitespace-nowrap text-sm font-medium tracking-tight text-on-art-muted transition-colors duration-[var(--dur-fast)] group-hover:text-on-art">
            <TickerTrack message={message} />
          </p>
        </div>
      </div>

      {href ? (
        <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-accent sm:inline-flex">
          {external ? "Open" : "Read more"}
          {external ? (
            <ExternalLink className="size-3.5" />
          ) : (
            <ArrowRight className="size-3.5" />
          )}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Conference notice ribbon above the site header. A pinned "Notice" kicker
 * stays put; the copy ticks beside it. Reduced-motion users get a static line.
 */
export function AnnouncementBar({
  message,
  href,
  external = false,
}: AnnouncementBarProps) {
  const skin = cn(
    "group relative block h-[var(--announce-h)]",
    "bg-forest text-on-art",
    "border-b border-accent/30",
    "transition-colors duration-[var(--dur-fast)] ease-out",
    href && "hover:border-accent",
    "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]",
  );

  const inner = (
    <BarInner message={message} href={href} external={external} />
  );

  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={skin}
      >
        {inner}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={skin}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={skin} role="region" aria-label="Announcement">
      {inner}
    </div>
  );
}
