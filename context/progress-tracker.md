# MERITMUN III — Progress Tracker

Updated as work completes. Any future session should be able to resume from this file alone.

**Legend:** ⬜ not started · 🟡 in progress · ✅ done · ⛔ blocked

**Current status:** Phase 1 of Produce complete — nine context files written.
**Awaiting:** human spec review. No application code written yet.

---

## Phase 0 — Foundation ⬜

| Item | Status |
|---|---|
| `.claude/launch.json` (port 3011) | ⬜ |
| `app/globals.css` — dark + light tokens, `@theme inline`, base layer | ⬜ |
| `lib/types.ts` | ⬜ |
| `lib/utils.ts` | ⬜ |
| `lib/theme.ts` | ⬜ |
| `app/layout.tsx` — fonts, theme script, metadata, skip link | ⬜ |
| Scaffold demo content + unused `public/*.svg` removed | ⬜ |
| Gates: tsc / lint / build / both-theme boot | ⬜ |

## Phase 1 — Content layer ⬜

| Item | Status |
|---|---|
| `content/site.ts` | ⬜ |
| `content/stats.ts` | ⬜ |
| `content/committees.ts` (12) | ⬜ |
| `content/board.ts` (14) | ⬜ |
| `content/schedule.ts` (3 days) | ⬜ |
| `content/faq.ts` (8) | ⬜ |
| Gates | ⬜ |

## Phase 2 — UI primitives ⬜

| Item | Status |
|---|---|
| 24 icons | ⬜ |
| `Button` `Card` `Badge` `Section` `SectionHeading` `Prose` | ⬜ |
| `Field` `Input` `Textarea` `Select` `Checkbox` `RadioGroup` | ⬜ |
| `Stepper` `Alert` `Disclosure` `Tabs` `Skeleton` `EmptyState` | ⬜ |
| `ui-registry.md` updated | ⬜ |
| Gates | ⬜ |

## Phase 3 — App shell ⬜

| Item | Status |
|---|---|
| `Wordmark` `SkipLink` | ⬜ |
| `SiteHeader` `MainNav` `MobileNav` | ⬜ |
| `ThemeToggle` (persisted, no-flash) | ⬜ |
| `SiteFooter` | ⬜ |
| `HelpWidget` | ⬜ |
| 11 route stubs | ⬜ |
| `not-found.tsx` `error.tsx` `loading.tsx` | ⬜ |
| Gates | ⬜ |

## Phase 4 — Homepage ⬜

| Item | Status |
|---|---|
| `HeroBackdrop` (duotone SVG) | ⬜ |
| `FlagArray` | ⬜ |
| `DelegateCollage` | ⬜ |
| `Hero` | ⬜ |
| `StatsBar` (floating, count-up) | ⬜ |
| `ValueProp` | ⬜ |
| `Aftermovie` | ⬜ |
| `CommitteePreview` `HomeCta` | ⬜ |
| Gates + reference-image fidelity check | ⬜ |

## Phase 5 — Committees ⬜

| Item | Status |
|---|---|
| `CommitteeCard` `CommitteeFilters` | ⬜ |
| `app/committees/page.tsx` + empty state | ⬜ |
| `CommitteeDetail` `ChairList` | ⬜ |
| `app/committees/[slug]/page.tsx` + static params + metadata + 404 | ⬜ |
| Gates | ⬜ |

## Phase 6 — About / Board / Schedule / Contact ⬜

| Item | Status |
|---|---|
| `app/about/page.tsx` | ⬜ |
| `InitialsMedallion` `BoardMemberCard` | ⬜ |
| `app/executive-board/page.tsx` | ⬜ |
| `DayTabs` `ScheduleTimeline` `ScheduleItem` | ⬜ |
| `app/schedule/page.tsx` | ⬜ |
| `ContactForm` + `app/contact/page.tsx` | ⬜ |
| Gates | ⬜ |

## Phase 7 — Registration ⬜

| Item | Status |
|---|---|
| `lib/validation.ts` | ⬜ |
| `lib/actions.ts` + `persist()` seam | ⬜ |
| `FormStep` `FormSummary` `SubmissionResult` `PricingNote` | ⬜ |
| `app/register/page.tsx` (two-path hub) | ⬜ |
| `DelegateForm` + route (+ `?committee=` preselect) | ⬜ |
| `DelegationForm` + route | ⬜ |
| `StatusLookupForm` + route | ⬜ |
| All form states reachable and verified | ⬜ |
| Gates | ⬜ |

## Phase 8 — States & sweep ⬜

| Item | Status |
|---|---|
| Route skeletons | ⬜ |
| Empty/error state sweep | ⬜ |
| Keyboard traversal audit | ⬜ |
| Heading/landmark/contrast audit (both themes) | ⬜ |
| Metadata + OG per route | ⬜ |
| `PRODUCT.md` + `DESIGN.md` derived | ⬜ |
| Gates | ⬜ |

## Phase 9 — `/impeccable` elevation ⬜

| Item | Status |
|---|---|
| Elevation directive run | ⬜ |
| Findings fixed | ⬜ |
| Follow-up commands run | ⬜ |
| Final verification, both themes | ⬜ |

---

## Notes & deviations

_Record here any decision made during the build that differs from the context files, and update
the source file too. Empty at spec time._
