/**
 * The duotone architectural field behind the hero — an assembly-hall colonnade
 * under a dome, in three plies of green. Authored rather than photographed
 * because no licensed photography exists for this conference; the ply tokens
 * are the swap point if that changes.
 *
 * Decorative. It must never compete with the headline, which is why the scrim
 * gradient sits on top and guarantees contrast at every breakpoint.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-art-back" />

      <svg
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--art-back)" />
            <stop offset="100%" stopColor="var(--art-mid)" stopOpacity="0.55" />
          </linearGradient>
          <clipPath id="hero-dome-clip">
            <path d="M720 96c72 0 130 58 130 130v18H590v-18c0-72 58-130 130-130Z" />
          </clipPath>
        </defs>

        <rect width="1440" height="720" fill="url(#hero-sky)" />

        {/* The architecture is a BACKDROP. Held at low opacity as a whole so it
            reads as depth behind the copy rather than as a subject competing
            with it — see the imagery rule in `context/ui-rules.md`. */}
        <g opacity="0.62">
        {/* distant skyline — the quietest ply */}
        <g fill="var(--art-mid)" opacity="0.45">
          <rect x="40" y="300" width="90" height="420" />
          <rect x="150" y="350" width="60" height="370" />
          <rect x="1230" y="330" width="80" height="390" />
          <rect x="1330" y="380" width="70" height="340" />
          <path d="M230 380h70v340h-70z" />
          <path d="M1150 400h60v320h-60z" />
        </g>

        {/* the dome and drum */}
        <g fill="var(--art-mid)">
          <path d="M720 96c72 0 130 58 130 130v18H590v-18c0-72 58-130 130-130Z" />
          <g clipPath="url(#hero-dome-clip)" stroke="var(--art-back)" strokeWidth="2" opacity="0.5">
            <path d="M720 90v160M640 100v150M800 100v150M660 244a60 260 0 0 1 120 0M600 244a120 260 0 0 1 240 0" fill="none" />
          </g>
          <rect x="700" y="52" width="40" height="46" rx="6" />
          <circle cx="720" cy="40" r="13" />
          <rect x="576" y="244" width="288" height="30" rx="4" />
          <rect x="560" y="274" width="320" height="18" rx="3" fill="var(--art-fore)" />
        </g>

        {/* colonnade — the load-bearing ply of the composition */}
        <g fill="var(--art-mid)">
          <rect x="300" y="292" width="840" height="16" rx="3" />
          {Array.from({ length: 13 }, (_, index) => {
            const x = 316 + index * 64;
            return (
              <g key={x}>
                {/* arch spandrel, recessed a ply deeper than the columns */}
                <path
                  d={`M${x} 308h48v112a24 24 0 0 0-48 0Z`}
                  fill="var(--art-back)"
                  opacity="0.7"
                />
                <rect x={x + 4} y="420" width="40" height="230" rx="4" />
                <rect x={x - 2} y="408" width="52" height="16" rx="3" />
                <rect x={x - 4} y="644" width="56" height="18" rx="3" />
              </g>
            );
          })}
          <rect x="292" y="662" width="856" height="20" rx="4" />
        </g>

        {/* steps at the base, where the flag row sits */}
        <g fill="var(--art-mid)" opacity="0.8">
          <rect x="180" y="682" width="1080" height="16" />
          <rect x="120" y="698" width="1200" height="22" />
        </g>
        </g>
      </svg>

      {/* Contrast guarantee for the headline. Stronger on the left where the
          copy lives, easing right so the collage keeps its depth — but never
          fully clearing, so the figures stay cutouts rather than a busy scene. */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,var(--art-scrim)_0%,var(--art-scrim)_40%,color-mix(in_oklch,var(--art-scrim)_35%,transparent)_80%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_top,var(--art-scrim),transparent)]" />
    </div>
  );
}
