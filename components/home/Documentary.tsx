"use client";

import { useRef, useState } from "react";
import { Play } from "@/components/icons/Play";
import { cn } from "@/lib/utils";

type DocumentaryProps = {
  title: string;
  src: string;
  poster: string;
  duration: string;
};

/**
 * The documentary player. Shows the poster with a play button and loads only
 * the metadata until someone presses play, so the homepage stays light.
 */
export function Documentary({ title, src, poster, duration }: DocumentaryProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    setStarted(true);
    void videoRef.current?.play();
  }

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-surface-inset shadow-lg">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          controls={started}
          onPlay={() => setStarted(true)}
          className="size-full object-contain"
        >
          Your browser does not support embedded video.
        </video>

        {!started ? (
          <button
            type="button"
            onClick={play}
            className={cn(
              "group absolute inset-0 grid place-items-center bg-[oklch(0.12_0.02_165/0.35)]",
              "focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-4",
            )}
          >
            <span className="grid size-20 place-items-center rounded-full bg-accent text-on-accent shadow-accent transition-transform duration-[var(--dur-base)] ease-out group-hover:scale-110">
              <Play className="size-8 translate-x-0.5" />
            </span>
            <span className="sr-only">Play {title}</span>
            <span className="pointer-events-none absolute right-4 bottom-4 rounded-xs bg-[oklch(0.12_0.02_165/0.75)] px-2 py-1 font-mono text-xs text-on-art">
              {duration}
            </span>
          </button>
        ) : null}
      </div>
    </figure>
  );
}
