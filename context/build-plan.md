# MERITMUN III — Build Plan

Nine phases, strictly ordered. Never improvise ordering. Each phase ends with the four
verification gates from `architecture.md` (`tsc --noEmit`, `lint`, `build`, both-theme
responsive check at 375/768/1440) plus its own definition of done, then a commit, then a
`progress-tracker.md` update.

The homepage is built **before** the interior pages because it is where the reference-image
fidelity and the whole visual language get established — everything downstream inherits from it.

---

## Phase 0 — Foundation

Strip the scaffold's defaults and install the design system.

- `.claude/launch.json` for the preview server on port 3011.
- `app/globals.css`: `@import "tailwindcss"`, the full dark + light token blocks from
  `ui-tokens.md`, `@theme inline` mappings, `@layer base` (reset, focus-visible, selection,
  global reduced-motion).
- `lib/types.ts` — every type in the architecture schema section.
- `lib/utils.ts` — `cn()`, `getField()`, `slugify()`, `formatTimeRange()`, `generateReference()`.
- `lib/theme.ts` — storage key + no-flash script.
- `app/layout.tsx` — Fraunges/Inter via `next/font/google`, theme script, metadata template,
  skip link, `<main id="content">`. Geist removed.
- Delete the scaffold's `app/page.tsx` demo content and the unused `public/*.svg` files.

**Done when:** the app boots on 3011 with a blank themed page, `data-theme` flips correctly
via devtools, no flash on reload in either theme, all four gates pass.

## Phase 1 — Content layer

All data before all UI, so no component is ever written against an imagined shape.

- `content/site.ts` — nav items, conference meta (dates, venue, city), contact details, socials.
- `content/stats.ts` — the four hero figures.
- `content/committees.ts` — 12 committees, fully populated per the `Committee` type.
- `content/board.ts` — 8 secretariat + 6 directorate members.
- `content/schedule.ts` — 3 days, 8–12 items each.
- `content/faq.ts` — 8 Q&A entries.

Every placeholder line carries a `// PLACEHOLDER:` comment.

**Done when:** `tsc --noEmit` validates every module against `lib/types.ts` with `satisfies`,
and `grep -rn "PLACEHOLDER" content/` returns a usable launch checklist.

## Phase 2 — UI primitives

Everything in `components/ui/` and `components/icons/`.

- All 24 icons.
- `Button`, `Card`, `Badge`, `Section`, `SectionHeading`, `Prose`.
- `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`.
- `Stepper`, `Alert`, `Disclosure`, `Tabs`, `Skeleton`, `EmptyState`.

**Done when:** every primitive renders in all its variants and states (including
focus-visible, disabled, loading, error) in **both themes**; `ui-registry.md` marks them ✅;
no hard-coded visual literal exists anywhere in `components/ui/`.

## Phase 3 — App shell

- `Wordmark` (SVG lockup), `SkipLink`, `SiteHeader`, `MainNav` with active indicator,
  `MobileNav` sheet, `ThemeToggle`, `SiteFooter`, `HelpWidget`.
- Wire all of it into `app/layout.tsx`.
- Route stubs for all eleven routes so navigation is fully exercisable end to end.
- `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx`.

**Done when:** every nav link resolves; the theme toggle works and persists across reload;
the mobile sheet traps focus, closes on `Esc`, and returns focus to the trigger; the help
widget opens, is keyboard-operable, and dismisses; keyboard-only traversal of the shell is
clean in both themes.

## Phase 4 — Homepage

The reference-image hero and everything below it. The visual centrepiece.

1. `HeroBackdrop` — duotone SVG colonnade + contrast scrim.
2. `FlagArray` — stylised flag row along the hero base.
3. `DelegateCollage` — SVG cutout figures.
4. `Hero` — 7/5 split, sub-headline, `Discover the World of Diplomacy with MERITMUN III`
   display headline, gold `Register Now`, "Already registered? Check your status" link.
5. `StatsBar` — floating panel overlapping the hero base, count-up on mount.
6. `ValueProp` — why MERITMUN III, asymmetric editorial layout (not a 3-card grid).
7. `Aftermovie` — 16:9 player shell.
8. `CommitteePreview` + `HomeCta`.

**Done when:** the hero reads as the reference image at 1440px and degrades to a clean
stacked layout at 375px (collage repositioned, flags cropped, stats bar wrapped 2×2, headline
still fully legible); the headline holds ≥4.5:1 over the backdrop at every breakpoint in both
themes; the count-up respects reduced motion; nothing in the section violates a ban from
`ui-rules.md`.

## Phase 5 — Committees

- `app/committees/page.tsx` with `CommitteeFilters`, `CommitteeCard` grid, result count,
  empty state when filters match nothing.
- `app/committees/[slug]/page.tsx` with `generateStaticParams`, `generateMetadata`,
  `CommitteeDetail`, `ChairList`, `notFound()` for bad slugs, and a
  `Register for this committee` CTA that links `/register/delegate?committee=<slug>`.

**Done when:** all 12 detail pages build statically; filtering is correct and keyboard-operable;
the empty state appears and offers a clear-filters action; an invalid slug 404s properly.

## Phase 6 — About, Executive Board, Schedule, Contact

- **About** — the story, what MUN is, what MERITMUN III specifically offers, venue and dates,
  past-iteration recap. Prose-led, `--container-narrow`, no card grid.
- **Executive Board** — `BoardMemberCard` grid with the Secretary-General featured wider;
  secretariat and directorate as two labelled tiers; `InitialsMedallion`.
- **Schedule** — `DayTabs` + `ScheduleTimeline`; kinds visually distinguished by more than
  color; venue and time on every item.
- **Contact** — `ContactForm` alongside real contact details, map-less venue block, socials,
  and the FAQ disclosure list.

**Done when:** all four pages are complete and responsive in both themes; the schedule is
readable at 375px without horizontal scroll; the board hierarchy is visually legible; the
contact form validates and shows a success state.

## Phase 7 — Registration

The conversion core. Highest-care phase.

- `lib/validation.ts` — shared field + form validators for all four forms.
- `lib/actions.ts` — `submitDelegate`, `submitDelegation`, `submitContact`, `lookupStatus`,
  and the `persist()` seam.
- `app/register/page.tsx` — the two-path hub: *Register a Delegation* vs *Register a Delegate*,
  each with who it is for, what it costs, and how long it takes.
- `app/register/delegate/page.tsx` — `DelegateForm`, 4 steps: Personal → Experience →
  Committee preferences (3 ranked, must be distinct) → Review & submit. Honors
  `?committee=<slug>` preselect.
- `app/register/delegation/page.tsx` — `DelegationForm`, 4 steps: Institution → Head delegate →
  Delegation details → Review & submit. Live per-head pricing as size changes.
- `app/register/status/page.tsx` — `StatusLookupForm` with result, not-found, and error states.
- `SubmissionResult` with a mono reference code and clear next steps.

**Done when:** every form validates client- and server-side from the same module; submitting
with errors focuses the first invalid field and announces the count; the stepper is
keyboard-operable and back-navigable without data loss; every state (idle, validating,
submitting, success, server-error, not-found) is built and reachable; both themes verified.

## Phase 8 — States, polish pass prep, and full sweep

- `loading.tsx` skeletons that match their route's real layout.
- Verify every empty and error state site-wide.
- Full keyboard traversal of the entire site.
- Heading-level audit, landmark audit, contrast spot-check in both themes.
- Metadata and OpenGraph on every route.
- `progress-tracker.md` fully updated.
- Derive `PRODUCT.md` from `project-overview.md` and `DESIGN.md` from
  `ui-tokens.md` + `ui-rules.md`, at the project root, for `/impeccable`.

**Done when:** all four gates pass on a clean tree, every route renders correctly at
375/768/1440 in both themes, and `PRODUCT.md` + `DESIGN.md` exist.

## Phase 9 — `/impeccable` elevation

Automatic, no stop before it. Run the elevation directive from the produce skill: conversion
hierarchy, modern craft, domain graphics (Model UN / diplomacy — chamber, placards, flags,
gavel, timeline), both themes to an equal standard, battle-tested across breakpoints,
keyboard, and every state. Fix everything it surfaces; run any follow-up command it
recommends. If it rewrites fundamentals rather than refining, correct the context files and
say so in the final summary.

**Done when:** `/impeccable` returns clean and the site is production-grade in both themes.
