# MERITMUN III — Progress Tracker

Updated as work completes. Any future session should be able to resume from this file alone.

**Legend:** ⬜ not started · 🟡 in progress · ✅ done · ⛔ blocked

**Current status:** All nine phases complete. The site is built, polished, and passing every gate.

---

## Phase 0 — Foundation ✅

| Item | Status |
|---|---|
| `.claude/launch.json` (port 3011) | ✅ |
| `app/globals.css` — dark + light tokens, `@theme inline`, base layer | ✅ |
| `lib/types.ts` | ✅ |
| `lib/utils.ts` | ✅ |
| `lib/theme.ts` | ✅ |
| `app/layout.tsx` — fonts, theme script, metadata, skip link | ✅ |
| Scaffold demo content + unused `public/*.svg` removed | ✅ |
| Gates: tsc / lint / build / both-theme boot | ✅ |

## Phase 1 — Content layer ✅

| Item | Status |
|---|---|
| `content/site.ts` | ✅ |
| `content/stats.ts` | ✅ |
| `content/committees.ts` (12) | ✅ |
| `content/board.ts` (14) | ✅ |
| `content/schedule.ts` (3 days) | ✅ |
| `content/faq.ts` (8) | ✅ |
| Gates | ✅ |

## Phase 2 — UI primitives ✅

| Item | Status |
|---|---|
| 28 icons (4 more than planned: Filter, ExternalLink, ArrowLeft, ChevronRight) | ✅ |
| `Button` `Card` `Badge` `Section` `SectionHeading` `Prose` | ✅ |
| `Field` `Input` `Textarea` `Select` `Checkbox` `RadioGroup` | ✅ |
| `Stepper` `Alert` `Disclosure` `Tabs` `Skeleton` `EmptyState` | ✅ |
| `ui-registry.md` updated | ✅ |
| Gates | ✅ |

## Phase 3 — App shell ✅

| Item | Status |
|---|---|
| `Wordmark` `SkipLink` | ✅ |
| `SiteHeader` `MainNav` `MobileNav` | ✅ |
| `ThemeToggle` (persisted, no-flash) | ✅ |
| `SiteFooter` | ✅ |
| `HelpWidget` | ✅ |
| 11 route stubs | ✅ |
| `not-found.tsx` `error.tsx` `loading.tsx` | ✅ |
| Gates | ✅ |

## Phase 4 — Homepage ✅

| Item | Status |
|---|---|
| `HeroBackdrop` (duotone SVG) | ✅ |
| `FlagArray` | ✅ |
| `DelegateCollage` | ✅ |
| `Hero` | ✅ |
| `StatsBar` (floating, count-up) | ✅ |
| `ValueProp` | ✅ |
| `Aftermovie` | ✅ |
| `CommitteePreview` `HomeCta` | ✅ |
| Gates + reference-image fidelity check | ✅ |

## Phase 5 — Committees ✅

| Item | Status |
|---|---|
| `CommitteeCard` `CommitteeFilters` | ✅ |
| `app/committees/page.tsx` + empty state | ✅ |
| `CommitteeDetail` `ChairList` | ✅ |
| `app/committees/[slug]/page.tsx` + static params + metadata + 404 | ✅ |
| Gates | ✅ |

## Phase 6 — About / Board / Schedule / Contact ✅

| Item | Status |
|---|---|
| `app/about/page.tsx` | ✅ |
| `InitialsMedallion` `BoardMemberCard` | ✅ |
| `app/executive-board/page.tsx` | ✅ |
| `DayTabs` `ScheduleTimeline` `ScheduleItem` | ✅ |
| `app/schedule/page.tsx` | ✅ |
| `ContactForm` + `app/contact/page.tsx` | ✅ |
| Gates | ✅ |

## Phase 7 — Registration ✅

| Item | Status |
|---|---|
| `lib/validation.ts` | ✅ |
| `lib/actions.ts` + `persist()` seam | ✅ |
| `FormStep` `FormSummary` `SubmissionResult` `PricingNote` | ✅ |
| `app/register/page.tsx` (two-path hub) | ✅ |
| `DelegateForm` + route (+ `?committee=` preselect) | ✅ |
| `DelegationForm` + route | ✅ |
| `StatusLookupForm` + route | ✅ |
| All form states reachable and verified | ✅ |
| Gates | ✅ |

## Phase 8 — States & sweep ✅

| Item | Status |
|---|---|
| Route skeletons | ✅ |
| Empty/error state sweep | ✅ |
| Keyboard traversal audit | ✅ |
| Heading/landmark/contrast audit (both themes) | ✅ |
| Metadata + OG per route | ✅ |
| `PRODUCT.md` + `DESIGN.md` derived | ✅ |
| Gates | ✅ |

## Phase 9 — `/impeccable` elevation ✅

| Item | Status |
|---|---|
| Elevation directive run | ✅ |
| Findings fixed | ✅ |
| Follow-up commands run | n/a — no weakness warranted one |
| Final verification, both themes | ✅ |

---

## Notes & deviations

1. **OKLab lightness is not Lab L\*/100.** The first dark ramp (`--bg: oklch(0.17 …)`) resolved
   to `#03130c` — effectively black. The whole dark scale was re-tuned empirically in-browser
   to land `--bg` on `#12251d`. `--brand` was also darkened from L 0.58 to 0.52 so white-on-brand
   clears 4.5:1 (it was 3.58:1). `ui-tokens.md` now carries measured ratios, not estimates.
2. **Hero art tokens do not invert.** The duotone field is dark in both themes, so `--on-art`,
   `--on-art-muted`, and `--on-art-accent` are declared once in `:root` and never overridden.
   The site header remaps its foreground tokens inline when it floats over the hero, which is
   why the wordmark and nav stay legible in light mode.
3. **Photography replaced two authored SVGs.** `ppl.png` and `flags.png` were supplied
   mid-build; `DelegateCollage` and `FlagArray` were rewritten around them. The flag strip is
   a repeating background (`background-size: auto 100%`) rather than an `<Image>`, because a
   4:1 strip stretched full-bleed would need a ~480px band to stay uncropped.
4. **`cn()` has no conflict resolution.** A base `inline-flex`/`relative` in a component
   silently fought an incoming `hidden`/`absolute` twice (header wordmark, hero collage). The
   rule is now recorded in `code-standards.md`; layout-agnostic components take `className` raw.
5. **`RadioGroup` gained a controlled mode** (`value` + `onChange`) rather than a sibling
   component being authored.
6. **A CSS comment containing `L*/100` terminated itself early** and broke the PostCSS build.
   Caught by a subagent, not by tsc or lint — neither reads CSS comments.
7. **The committee slate is 12, not 13.** UNHCR was cut because it overlapped UNEP and UNHRC
   thematically, and because the marketing copy says twelve.
8. **The typeface pair was replaced during polish.** Fraunces/Inter were reflex picks made
   during Phase 0 — both are training-data defaults, and serif-display-over-neutral-sans is the
   saturated editorial lane. Now **Eczar** (display) over **Archivo** (text/UI), chosen against
   the brand's physical object. Display tracking was retuned from -0.035em to -0.018em for
   Eczar's narrower sidebearings. `ui-tokens.md` and `DESIGN.md` both record this.
9. **Four icon controls were under the 44px target floor** my own `ui-rules.md` mandates
   (theme toggle, menu trigger, mobile sheet close, help-widget close — all 36-40px). Raised
   to 44px. Caught by an automated traversal, not by eye.
10. **Contrast auditing needs alpha compositing.** A naive walk-up-for-a-background audit
   reported ~30 false failures on the hero and forest bands: it ignored `/75`-style alpha and
   missed absolutely-positioned backdrops. Re-measured with proper compositing, every pairing
   passes in both themes (lowest 4.73:1). Do not trust an audit that does not composite.
