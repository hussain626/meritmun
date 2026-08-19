"use client";

import { useState } from "react";
import { Play } from "@/components/icons/Play";
import { cn } from "@/lib/utils";

type AftermovieProps = {
  title: string;
  description: string;
  duration: string;
  /** Drop the mp4/embed URL here; the shell already handles the loaded state. */
  src: string | null;
  chapters: readonly string[];
};

export function Aftermovie({
  title,
  description,
  duration,
  src,
  chapters,
}: AftermovieProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-surface-inset shadow-lg">
      <div className="relative aspect-video">
        {isPlaying && src ? (
          <video
            src={src}
            controls
            autoPlay
            className="size-full bg-black object-cover"
          >
            Your browser does not support embedded video.
          </video>
        ) : (
          <>
            {/* Poster frame — an authored still of a committee in session,
                in the same visual language as the hero backdrop. */}
            <svg
              viewBox="0 0 1280 720"
              className="absolute inset-0 size-full"
              aria-hidden="true"
              preserveAspectRatio="xMidYMid slice"
            >
              <rect width="1280" height="720" fill="var(--art-back)" />
              <g fill="var(--art-mid)">
                <rect y="470" width="1280" height="250" />
                <path d="M0 470h1280v18H0z" fill="var(--art-fore)" />
              </g>
              {/* rows of desks receding */}
              {[0, 1, 2].map((row) => {
                const y = 500 + row * 74;
                const inset = 120 - row * 60;
                return (
                  <g key={row} opacity={0.5 + row * 0.18}>
                    <rect
                      x={inset}
                      y={y}
                      width={1280 - inset * 2}
                      height="52"
                      rx="4"
                      fill="var(--art-fore)"
                    />
                    {Array.from({ length: 7 - row }, (_, seat) => {
                      const span = (1280 - inset * 2) / (7 - row);
                      return (
                        <rect
                          key={seat}
                          x={inset + span * seat + span / 2 - 9}
                          y={y - 34}
                          width="18"
                          height="34"
                          rx="9"
                          fill="var(--art-back)"
                        />
                      );
                    })}
                  </g>
                );
              })}
              {/* dais and the flag pair behind it */}
              <g>
                <rect x="520" y="300" width="240" height="14" rx="4" fill="var(--art-fore)" />
                <rect x="556" y="120" width="7" height="182" rx="3" fill="var(--art-fore)" />
                <rect x="717" y="120" width="7" height="182" rx="3" fill="var(--art-fore)" />
                <rect x="563" y="132" width="76" height="46" fill="oklch(0.45 0.09 163)" />
                <rect x="641" y="132" width="76" height="46" fill="oklch(0.72 0.11 86)" opacity="0.75" />
                <circle cx="640" cy="230" r="52" fill="none" stroke="var(--art-fore)" strokeWidth="3" opacity="0.7" />
                <ellipse cx="640" cy="230" rx="22" ry="52" fill="none" stroke="var(--art-fore)" strokeWidth="3" opacity="0.7" />
                <path d="M588 230h104M600 200h80M600 260h80" stroke="var(--art-fore)" strokeWidth="3" opacity="0.7" />
              </g>
              <rect width="1280" height="720" fill="var(--art-scrim)" opacity="0.45" />
            </svg>

            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              disabled={!src}
              className={cn(
                "group absolute inset-0 grid place-items-center",
                "focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-4",
                !src && "cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "grid size-20 place-items-center rounded-full bg-accent text-on-accent shadow-accent",
                  "transition-transform duration-[var(--dur-base)] ease-out",
                  src && "group-hover:scale-110",
                )}
              >
                <Play className="size-8 translate-x-0.5" />
              </span>
              <span className="sr-only">
                {src ? `Play ${title}` : `${title} — video coming soon`}
              </span>
            </button>

            <p className="pointer-events-none absolute right-4 bottom-4 rounded-xs bg-[oklch(0.12_0.02_165/0.75)] px-2 py-1 font-mono text-xs text-on-art">
              {duration}
            </p>

            {!src ? (
              <p className="pointer-events-none absolute top-4 left-4 rounded-xs bg-[oklch(0.12_0.02_165/0.75)] px-2.5 py-1 text-xs font-semibold text-on-art">
                Publishing soon
              </p>
            ) : null}
          </>
        )}
      </div>

      <figcaption className="flex flex-col gap-4 border-t border-line bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
          {chapters.map((chapter) => (
            <li key={chapter} className="text-xs text-fg-faint">
              {chapter}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
