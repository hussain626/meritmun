# MERITMUN III — Design

Derived from `context/ui-tokens.md` and `context/ui-rules.md`. Those two remain the fuller
reference; this is the working brief.

## Color strategy: **committed**

One dominant hue family — diplomatic green — carried across surface, structure, and accent,
with a single high-contrast warm gold for the primary action and nothing else. Not restrained
(green is the environment, not a garnish), not drenched (body copy sits on near-neutral
surfaces so long-form reading holds up). Green is the brand. The gold is the button.

**Accent discipline:** gold appears on primary CTAs, the active nav indicator, and stat
figures. Nowhere else. A fourth use is a defect.

## Scene sentence

> A seventeen-year-old is lying in bed at 11:40pm, phone at 40% brightness, deciding whether
> to spend their November on this conference — and their MUN society head is checking the same
> site at 9am in a fluorescent-lit staffroom.

**Default theme: dark.** Dark makes the emerald read as a *room* — a chamber, a hall at night —
which is what the product is selling. Light is a full-quality peer tuned for the staffroom
monitor, not a concession. The toggle is a first-class control in the header, persists to
`localStorage`, and respects `prefers-color-scheme` on first visit via a blocking head script
(no flash).

## Tokens

All color is **OKLCH**, declared as raw custom properties on `:root` and overridden under
`[data-theme="light"]`, then exposed to Tailwind v4 through `@theme inline` in
`app/globals.css`. There is no `tailwind.config.js` and **no `dark:` variant anywhere** —
theming is entirely token values.

> **OKLab lightness is not Lab L\*/100.** `oklch(0.17 …)` renders near-black. The dark ramp was
> tuned empirically in-browser; `--bg` lands on `#12251d`. Every contrast figure in
> `context/ui-tokens.md` was **measured**, not estimated. Re-measure before changing a value.

Key utility names: `bg-canvas` / `bg-canvas-subtle` / `bg-surface` / `bg-surface-raised` /
`bg-surface-inset`, `border-line` / `border-line-strong`, `text-fg` / `text-fg-muted` /
`text-fg-faint`, `bg-brand` / `bg-brand-soft` / `text-brand-fg`, `bg-forest`, `bg-accent` /
`text-accent-fg`, `text-on-brand` / `text-on-accent`, `outline-focus`.

**Hero art tokens do not invert.** The hero's duotone field is dark in *both* themes — the
duotone is the brand image. So `--art-back/mid/fore`, `--art-scrim`, and the copy tokens
`--on-art`, `--on-art-muted`, `--on-art-accent` are declared once and never overridden. Hero
copy uses `--on-art*`, never `--fg`. The site header remaps its foreground tokens inline while
it floats over the hero, which is what keeps the wordmark and nav legible in light mode.

## Type

`Fraunces` (display, 700, opsz axis) over `Inter` (400–700). A serif display against a sans
body is the institutional register the brand needs — a decision, not a default.
Fluid `clamp()` scale; display maxes at **5.25rem** (under the 6rem cap). Tracking floor
**-0.035em** (never tighter than -0.04em). Prose capped at `68ch`, leads at `54ch`.

## Absolute bans

1. No side-stripe accent borders.
2. No gradient text — including the hero headline.
3. No glassmorphism by default. `backdrop-filter` only where content genuinely scrolls beneath:
   the scrolled site header and the mobile nav backdrop.
4. No hero-metric template. The floating stats bar is the **only** stat block on the site.
5. No grids of identical icon + heading + text cards.
6. No uppercase tracked eyebrow above every section. Budget: **three site-wide** (hero
   sub-headline, committee detail "Agenda", schedule day marker).
7. No 01/02/03 numbering as scaffolding. Numerals only where order is semantically real:
   the registration stepper and the schedule's day sequence.
8. No decorative blur orbs or floating gradient blobs.
9. No emoji as iconography. 28 authored SVG icons at 1.5px stroke, `currentColor`.
10. No hard-coded color, spacing, radius, or shadow literal in any `.tsx`.

## Rules

- **Cards are a container of last resort** — used by exactly three features (committees, board
  members, register hub). Value props, schedule items, and FAQs use editorial, timeline, and
  disclosure patterns instead.
- **One primary CTA per view.** Gold. If a second gold button appears above the fold, one is wrong.
- **Asymmetry over symmetry.** A 7/5 split reads composed; 6/6 reads like a wireframe.
- **Reveal animations enhance already-visible content.** Content renders in final position;
  animation adds an offset that resolves. Visibility is never gated on a scroll class. Every
  animation has a `prefers-reduced-motion` alternative, and that alternative is "final state,
  instantly" — never "nothing where something should be".
- House curve `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`. Stagger capped at 6 items.
- **Forms:** visible labels always, never placeholder-as-label. Validate on blur, then on
  change once a field is already in error. Mark *optional*, not required. The submit button is
  never disabled to block invalid input — it validates, shows errors, and moves focus to the
  first invalid field. Shared validators run client- and server-side from one module.
- **Accessibility floor** (a build requirement, not polish): skip link, semantic landmarks,
  sequential headings with one `h1`, visible focus on everything, focus trapped in the mobile
  sheet and help widget with `Esc` to close and focus returned, 44px targets, and colour never
  the sole carrier of meaning.

## Imagery

- **Delegate collage** — supplied photograph (`public/ppl.png`, alpha cutout), bottom-anchored
  and absolutely placed so it stands in front of the flag row with its crop edge clipped.
- **Flag array** — supplied photograph (`public/flags.png`, alpha strip), rendered as a
  repeating background at `background-size: auto 100%` so every flag shows whole regardless of
  viewport width, graded with `saturate-[0.88]`, a scrim, and a light forest multiply.
- **Hero backdrop** — authored SVG colonnade under a dome, three green plies, held at 0.62
  opacity. No building photograph exists; this is the swap seam.
- **Aftermovie poster** — authored SVG of a committee in session, same three-ply language.
- Every graphic must clarify, persuade, or orient. Decorative ones are `aria-hidden`. All must
  render correctly in **both** themes.
