# MERITMUN III — UI Registry

**Check this file before creating any component.** If something close already exists, extend
it with a prop rather than authoring a sibling. Update the Status column as each component
lands — this file is only useful if it is current.

Status: `⬜ not started` · `🟡 in progress` · `✅ built`

---

## `components/layout/`

| Component | Status | Client? | Purpose | Key props |
|---|---|---|---|---|
| `SiteHeader` | ⬜ | no | Sticky top bar: wordmark left, nav right, theme toggle + Register CTA. Becomes opaque + `--shadow-sm` after 24px scroll. | `–` |
| `Wordmark` | ⬜ | no | SVG "MERITMUN III" lockup. Token-colored, works both themes. | `size`, `variant: 'full'\|'mark'` |
| `MainNav` | ⬜ | no | Desktop nav list; active route gets a gold underline indicator. | `items`, `pathname` |
| `MobileNav` | ⬜ | **yes** | Hamburger → full-height sheet. Focus-trapped, Esc-closable, body-scroll-locked. | `items` |
| `ThemeToggle` | ⬜ | **yes** | Sun/moon control. Reads/writes `localStorage`, sets `data-theme`. Accessible label reflects the *action*. | `–` |
| `SiteFooter` | ⬜ | no | Four columns: identity, site links, register links, contact + socials. `--forest` band. | `–` |
| `HelpWidget` | ⬜ | **yes** | Sticky bottom-right bubble → panel with top FAQs + link to Contact. Dismissible, remembers dismissal for the session. | `faqs` |
| `SkipLink` | ⬜ | no | First tab stop, visible on focus. | `–` |

## `components/ui/`

| Component | Status | Client? | Purpose | Key props |
|---|---|---|---|---|
| `Button` | ⬜ | no | 4 variants × 3 sizes, loading + disabled. Renders `<button>` or `<a>` via `asChild`-style `href` prop. | `variant`, `size`, `href`, `loading`, `iconStart/End` |
| `Card` | ⬜ | no | Surface + hairline + radius. `interactive` adds hover lift. | `interactive`, `as`, `padding` |
| `Badge` | ⬜ | no | Tinted pill. | `tone: brand\|success\|warning\|neutral`, `size` |
| `SectionHeading` | ⬜ | no | h2 + optional lead paragraph + optional trailing action. Enforces the ≤3 eyebrow budget via an explicit `eyebrow` prop that is used exactly three times site-wide. | `title`, `lead`, `eyebrow?`, `action?`, `align` |
| `Section` | ⬜ | no | `<section>` wrapper: `--section-y`, container, optional `--bg-subtle` band. | `band`, `width: 'default'\|'narrow'\|'full'`, `id` |
| `Field` | ⬜ | no | Label + control slot + helper + error. Wires `aria-describedby`/`aria-invalid`. | `label`, `name`, `error`, `helper`, `optional` |
| `Input` | ⬜ | no | Text/email/tel/number. | native + `invalid` |
| `Textarea` | ⬜ | no | Auto-min-height 5 rows, counter when `maxLength` set. | native + `invalid` |
| `Select` | ⬜ | no | Native select, custom chevron, token-styled. | `options`, `placeholder` |
| `Checkbox` | ⬜ | no | 20px box, gold check, label is the hit target. | `label`, `error` |
| `RadioGroup` | ⬜ | no | Card-style radios for experience level / topic. | `options`, `name`, `value` |
| `Stepper` | ⬜ | no | Numbered progress with step names; completed steps are buttons. | `steps`, `current`, `onStepClick` |
| `Alert` | ⬜ | no | Info/success/warning/danger. Tinted fill + icon, **no side stripe**. | `tone`, `title`, `children` |
| `Disclosure` | ⬜ | **yes** | Accessible accordion item (FAQ, committee focus points). | `question`, `children`, `defaultOpen` |
| `Tabs` | ⬜ | **yes** | Roving-tabindex tablist. Used by schedule days. | `tabs`, `value`, `onChange` |
| `Skeleton` | ⬜ | no | Shimmer block for `loading.tsx`; static in reduced-motion. | `w`, `h`, `radius` |
| `EmptyState` | ⬜ | no | Small SVG glyph + heading + one sentence + one action. | `title`, `body`, `action`, `glyph` |
| `Prose` | ⬜ | no | Typographic wrapper for long-form About copy. | `children` |

## `components/home/`

| Component | Status | Client? | Purpose | Key props |
|---|---|---|---|---|
| `Hero` | ⬜ | no | The reference-image hero: 7/5 split, sub-headline, display headline, gold CTA, status link. | `stats` (for layout offset only) |
| `HeroBackdrop` | ⬜ | no | Duotone SVG colonnade/skyline + contrast scrim. Decorative. | `–` |
| `FlagArray` | ⬜ | no | Stylised SVG flag row along the hero base. Crops, never squashes. | `count` |
| `DelegateCollage` | ⬜ | no | SVG cutout figures — mic, placard, presenting. Load-in stagger, reduced-motion-safe. | `–` |
| `StatsBar` | ⬜ | **yes** | Floating white panel overlapping the hero base by `--statsbar-overlap`. Four figures, count-up once on mount. | `stats` |
| `ValueProp` | ⬜ | no | "Why MERITMUN III" — deliberately *not* a 3-card grid; asymmetric editorial layout. | `points` |
| `Aftermovie` | ⬜ | **yes** | 16:9 player shell: poster, play affordance, duration, caption. Click reveals the `<video>`/embed seam. | `posterAlt`, `src?`, `duration` |
| `CommitteePreview` | ⬜ | no | Home teaser: 3 featured committees + "See all twelve". | `committees` |
| `HomeCta` | ⬜ | no | Closing band: the two register paths side by side. | `–` |

## `components/committees/`

| Component | Status | Client? | Purpose | Key props |
|---|---|---|---|---|
| `CommitteeCard` | ⬜ | no | Abbr, name, agenda, type + difficulty badges, seats. Whole card is the link. | `committee` |
| `CommitteeFilters` | ⬜ | **yes** | Type + difficulty filter pills, live result count, clear-all. Owns the filtered list. | `committees` |
| `CommitteeDetail` | ⬜ | no | Detail page body: agenda, overview, focus points, chairs, seats, guide link, deep-linked register CTA. | `committee` |
| `ChairList` | ⬜ | no | Chairs with initials medallions. | `chairs` |

## `components/board/`

| Component | Status | Client? | Purpose | Key props |
|---|---|---|---|---|
| `BoardMemberCard` | ⬜ | no | Initials medallion, name, role, bio, optional mail link. `featured` widens for the SG. | `member`, `featured` |
| `InitialsMedallion` | ⬜ | no | Generated avatar from initials on `--brand-soft`. Reused by `ChairList`. | `initials`, `size` |

## `components/schedule/`

| Component | Status | Client? | Purpose | Key props |
|---|---|---|---|---|
| `DayTabs` | ⬜ | **yes** | Three-day switcher built on `Tabs`; renders the active day's timeline. | `days` |
| `ScheduleTimeline` | ⬜ | no | Vertical rail with time gutter. Not cards — a real timeline. | `items` |
| `ScheduleItem` | ⬜ | no | One row: time range, title, kind marker, venue. | `item` |

## `components/forms/`

| Component | Status | Client? | Purpose | Key props |
|---|---|---|---|---|
| `DelegateForm` | ⬜ | **yes** | 4-step delegate application. `useActionState` + client validation + review step. | `committees`, `preselect?`, `action` |
| `DelegationForm` | ⬜ | **yes** | 4-step delegation application. | `committees`, `action` |
| `ContactForm` | ⬜ | **yes** | Single-step contact message. | `action` |
| `StatusLookupForm` | ⬜ | **yes** | Reference-code lookup + result/not-found states. | `action` |
| `FormStep` | ⬜ | no | Titled step wrapper + fieldset semantics + live-region announcement. | `title`, `description`, `current`, `total` |
| `FormSummary` | ⬜ | no | Review step: grouped label/value pairs with per-section "Edit". | `sections` |
| `SubmissionResult` | ⬜ | no | Success screen: reference code (mono), what happens next, secondary actions. | `reference`, `kind` |
| `PricingNote` | ⬜ | no | Fee line shown in-form so cost is never a surprise at submit. | `tier` |

## `components/icons/`

⬜ One named export per file, 24×24 viewBox, `stroke-width: 1.5`, `currentColor`:
`ArrowRight` `Check` `ChevronDown` `Close` `Menu` `Sun` `Moon` `Play` `Mail` `Phone` `MapPin`
`Calendar` `Clock` `Users` `Globe` `Gavel` `FileText` `Search` `AlertTriangle` `Info`
`Instagram` `Linkedin` `HelpCircle` `Sparkle`

---

## Reuse notes

- `InitialsMedallion` serves both the board page and committee chairs — do not author a second.
- `Tabs` is the primitive; `DayTabs` is its only consumer. Do not build a second tab system.
- `Card` is used by exactly three features (committees, board, register hub). Anything else
  wanting a card should re-read the cards rule in `ui-rules.md` first.
- `Field` wraps every control. No form component styles a label itself.
- All four forms share `lib/validation.ts`. No form has private validation logic.
