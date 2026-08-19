# MERITMUN III — UI Rules

How the tokens become an interface. `ui-tokens.md` says what the values are; this file says
how they behave. Both are law during the build, not suggestions for the polish pass.

---

## Absolute bans

These are not stylistic preferences. A build that violates one is wrong and gets fixed.

1. **No side-stripe accent borders.** No `border-left: 4px solid var(--accent)` on cards,
   callouts, quotes, or alerts. Differentiate with fill, type weight, or an icon.
2. **No gradient text.** `background-clip: text` is banned everywhere, including the hero
   headline. The headline earns impact through size, weight, and contrast.
3. **No glassmorphism by default.** `backdrop-filter` is permitted in exactly two places, both
   because content genuinely scrolls beneath: the sticky site header (once scrolled) and the
   mobile nav sheet backdrop. Nowhere else — not on cards, not on the stats bar, not on the
   help widget.
4. **No hero-metric template.** The floating stats bar is a *specified requirement* with four
   real figures and a distinct floating-panel treatment. It is the only stat block on the
   site. Do not repeat "3 big numbers in a row" on About, Committees, or anywhere else.
5. **No identical icon + heading + text card grids.** If a section has three points to make,
   they get differentiated treatment — varied span, an inline visual, an asymmetric layout —
   or they are not cards at all. The three-identical-cards row is the single clearest tell of
   generated design.
6. **No uppercase tracked eyebrow above every section.** The small-caps label is allowed at
   most **three times site-wide**, where it does real navigational work (hero sub-headline,
   committee detail meta line, schedule day marker). Everywhere else, the heading stands alone.
7. **No 01 / 02 / 03 section numbering** as scaffolding. Numerals appear only where the order
   is semantically real: the registration stepper, and the schedule's day sequence.
8. **No decorative blur orbs / floating gradient blobs.** The hero has authored artwork; it
   does not need atmosphere smeared behind it.
9. **No emoji as UI iconography.** Icons are authored SVG at a consistent 1.5px stroke.
10. **No hard-coded color, spacing, radius, or shadow literals** in any `.tsx`. Tokens only.

---

## Cards

Cards are a container of last resort. Use one **only** when the content is a genuinely
discrete, repeatable, individually-actionable unit. In this project that is exactly:
committee cards, board-member cards, and the register hub's two path cards. Nothing else
gets a card — value props, schedule items, and FAQ entries use list, timeline, and
disclosure patterns respectively.

**Anatomy:** `--surface` fill, `--border` 1px hairline, `--radius-md`, `--space-lg` padding.
No shadow at rest in dark theme (tone does the separating); `--shadow-sm` at rest in light.
**Hover** (only if the card is a link): border → `--border-strong`, `translateY(-2px)`,
shadow steps up one level, `--dur-fast --ease-out`. Never scale a card. Never change its fill
hue on hover.

**The card is the link.** One `<a>` wrapping the whole card with a real accessible name — not
a "Read more" link in the corner with a click handler on the parent.

---

## Buttons

Four variants. No fifth is added without recording it in `ui-registry.md`.

| Variant | Fill | Text | Border | Use |
|---|---|---|---|---|
| `primary` | `--accent` | `--text-on-accent` | none | The one committing action per view |
| `secondary` | `--brand` | `--text-on-brand` | none | Meaningful but non-committing |
| `outline` | transparent | `--text` | 1px `--border-strong` | Tertiary, in-context |
| `ghost` | transparent | `--text-muted` | none | Icon buttons, dismissals, nav |

Sizes: `sm` (36px), `md` (44px, default), `lg` (52px, hero CTA only).
Radius `--radius-md`. Weight 600. Tracking `--tracking-tight`.

**States:** hover → one step darker fill (`--accent-strong` / `--brand-strong`) + `--shadow-accent`
on primary only. Active → `translateY(1px)`, no shadow. Focus-visible → 2px `--focus` ring at
2px offset, always, on every variant. Disabled → 45% opacity, `cursor: not-allowed`, no hover.
Loading → spinner replaces the label, width is preserved so nothing reflows, `aria-busy="true"`.

**One primary per view.** The hero has one gold button. If a second gold button appears above
the fold, one of them is wrong.

---

## Badges

`--radius-xs`, `--text-xs`, weight 600, `--space-2xs --space-xs` padding. Tinted fill +
matching foreground token, no border, no side stripe.
Difficulty: beginner → success tint, intermediate → brand tint, advanced → warning tint.
Committee type badges use `--surface-inset` fill with `--text-muted`.

---

## Inputs & forms

The forms are where the site converts. They get the most care.

- **Field anatomy:** always a visible `<label>` above the control. Never a placeholder as a
  label. Helper text below the label, in `--text-muted`. Error text below the control, in
  `--danger-fg`, with a small inline warning icon.
- **Control:** `--surface` fill, 1px `--border`, `--radius-sm`, 44px min height, 16px font
  minimum (prevents iOS zoom on focus).
- **Focus:** border → `--brand`, plus a 2px `--focus` ring at 2px offset. Both, not either.
- **Error:** border → `--danger`, `aria-invalid="true"`, `aria-describedby` wired to the error
  node. On submit failure, focus moves to the first invalid field and the page does not jump.
- **Validation timing:** validate on **blur** for a field the user has left, and on **change**
  once a field is already in error (so the error clears as they fix it). Never validate on
  first keystroke of an untouched field — that is hostile.
- **Required marking:** required is the default; mark **optional** fields with a muted
  "(optional)" in the label. Fewer asterisks, less visual noise.
- **Stepper:** a real progress indicator with step names, current step marked
  `aria-current="step"`, completed steps clickable to go back, future steps not.
  Step content is announced via a live region on change.
- **No field is asked for twice**, and no field exists that the conference does not actually
  need. Friction is the enemy.
- **Submit:** the button is never disabled to block invalid submission — the user presses it,
  validation runs, and errors are shown. A disabled button that never explains itself is a
  dead end. It *is* disabled while a submission is in flight.

---

## Layout patterns

- **Section:** `<section>` with `--section-y` padding, container-constrained, optional
  `--bg-subtle` band for alternation. Bands alternate on a deliberate rhythm, never
  every-other-by-default.
- **Prose:** `--container-narrow`, `--leading-relaxed`, `--measure`.
- **Grids:** committees `1 / 2 / 3` columns at `base / md / lg`. Board `1 / 2 / 4`, with the
  Secretary-General given a wider span at `lg` — the hierarchy is real, the layout should
  show it. Never a uniform grid where the content is not uniform.
- **Asymmetry is preferred to symmetry** wherever content allows. A 7/5 split reads composed;
  a 6/6 split reads like a wireframe.

---

## Motion

- All entrance motion uses `--ease-out` and `--dur-slow`; interaction feedback uses
  `--dur-fast`.
- **Reveal animations enhance already-visible content.** Content is rendered visible and in
  final position in the DOM; the animation adds a subtle offset that resolves. Visibility is
  **never** gated on a scroll-triggered class — if JS fails, every word is still on screen.
  Implemented with a CSS `animation` that begins from a transformed state, so the no-JS and
  reduced-motion paths simply show the final state.
- **Stagger** via `--stagger` on grid children, capped at 6 items — beyond that it reads slow.
- **Every animation has a `prefers-reduced-motion` alternative**, and the alternative is
  "final state, instantly", not "nothing happens where something should have".
- Permitted motion: button/card hover feedback, stepper transitions, disclosure expand,
  mobile nav sheet slide, help-widget open, hero art parallax-on-load (once, not on scroll),
  stat figure count-up (once, respects reduced motion by rendering the final number).
- Banned motion: infinite loops, marquees, anything that moves while the user is reading,
  scroll-hijacking, parallax tied to scroll position.

---

## Imagery & graphics

Two sources: **supplied photography** for the hero's human content, and **authored SVG/CSS**
for everything else. Every graphic must clarify, persuade, or orient.

- **Delegate collage — photograph.** `public/ppl.png`, an alpha-channel cutout of student
  delegates at microphones, holding placards, presenting. Rendered with `next/image`,
  bottom-anchored, absolutely positioned so it runs past the hero's bottom padding and stands
  in front of the flag row, with its hard crop edge clipped by the section's overflow.
  Decorative: `alt=""` + `aria-hidden`.
- **Flag array — photograph.** `public/flags.png`, an alpha-channel strip of world flags along
  the hero base. Graded to sit in the emerald world rather than fight it: `saturate-[0.88]`, a
  `--art-scrim` gradient over the top edge so the flags emerge from the architecture instead
  of being pasted onto it, and a light `--forest` multiply. Crops rather than squashes on
  mobile via `object-cover object-bottom`.
- **Duotone hero backdrop — authored SVG.** An original architectural field (assembly-hall
  colonnade under a dome) in three green plies, `--art-back` / `--art-mid` / `--art-fore`.
  No building photograph was supplied, so this stays SVG. It is a backdrop: held at ~0.62
  opacity as a whole so it never competes with the headline, with a scrim gradient
  guaranteeing headline contrast at every breakpoint.
- **Aftermovie poster — authored SVG.** A committee-in-session still in the same three-ply
  language, so the video shell is never an empty grey box.
- **Board avatars:** generated initials medallions on a `--brand-soft` fill until real photos
  exist.
- Every graphic is verified in **both themes** — tokens only, no baked hex.
- Decorative SVGs get `aria-hidden="true"`; informational ones get `<title>` + `role="img"`.

---

## Accessibility floor

Not a polish item — a build requirement.

- Semantic landmarks: one `<header>`, one `<main>`, one `<footer>`, `<nav aria-label>`.
- A skip-to-content link, first in tab order, visible on focus.
- Every interactive element reachable and operable by keyboard, in a sane order.
- Focus is never removed; `:focus-visible` ring is on every control.
- Mobile nav sheet and help widget: focus trapped while open, `Esc` closes, focus returns to
  the trigger, background inert.
- Heading levels are sequential; one `<h1>` per page.
- Color is never the only carrier of meaning — status and difficulty always pair color with
  text.
- Target size ≥ 44×44px for anything tappable.
- `lang="en"` on `<html>`; `data-theme` toggled alongside a `color-scheme` declaration.

---

## Copy voice

Institutional but not stiff. Short declaratives. Specific over grand — "twelve committees,
three days, six hundred seats" beats "an unforgettable journey of diplomacy."

- CTAs are verbs with an object: "Register as a delegate", not "Get started" / "Learn more".
- Headings state the thing; they do not tease it.
- **Banned words:** unleash, elevate, seamless, journey, empower, revolutionise, game-changing,
  "in today's world", "more than just a conference".
- Empty and error states say what happened, why, and what to do next — three short sentences
  maximum, with an action.
