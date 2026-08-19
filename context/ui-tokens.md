# MERITMUN III — UI Tokens

## Color strategy: **committed**

One dominant hue family — diplomatic green — carried across surface, structure, and accent,
with a single high-contrast warm metallic for the primary action and nothing else. Not
restrained (green is not a garnish here; it is the environment), not drenched (body copy
sits on near-neutral surfaces so long-form reading holds up), and definitely not full-palette.
Green is the brand. The gold is the button. Everything else is a neutral tuned green.

**Accent discipline:** gold (`--color-accent`) appears on primary CTAs, the active nav
indicator, and stat figures. Nowhere else. If gold shows up in a fourth place, remove it.

## Scene sentence

> A seventeen-year-old is lying in bed at 11:40pm, phone at 40% brightness, deciding whether
> to spend their November on this conference — and their MUN society head is checking the same
> site at 9am in a fluorescent-lit staffroom.

Both readings must be excellent, but the first is the conversion. **Default theme: dark.**
Dark makes the emerald read as a room — a chamber, a hall at night — which is what the product
is selling. Light theme is a full-quality peer, tuned for the staffroom monitor, not a
concession.

## Format

All colors are **OKLCH**. All tokens are CSS custom properties on `:root`, overridden under
`[data-theme="light"]`. Tailwind v4 consumes them through `@theme inline` in `globals.css` —
there is no `tailwind.config.js`.

Structure of `app/globals.css`:

```css
@import "tailwindcss";

:root { /* dark = default, all tokens below */ }
[data-theme="light"] { /* every color token re-stated */ }

@theme inline {
  --color-*: var(--*);   /* map tokens into Tailwind utilities */
  --font-*: ...;
  --radius-*: ...;
}

@layer base { /* html, body, focus-visible, selection, reduced-motion */ }
```

---

## Color tokens

> ⚠️ **OKLab L is not Lab L\*/100.** An `L` of `0.17` renders at Lab L\* ≈ 4.7 — effectively
> black. The dark ramp below was tuned empirically in-browser so `--bg` resolves to a visible
> deep emerald (`#12251d`), not black. Every ratio in these tables was **measured**, not
> estimated. Re-measure before changing any value.

### Dark theme (default, `:root`)

| Token | OKLCH | Resolves | Role |
|---|---|---|---|
| `--bg` | `oklch(0.245 0.030 165)` | `#12251d` | page background — deep emerald |
| `--bg-subtle` | `oklch(0.285 0.034 165)` | | alternating section band |
| `--surface` | `oklch(0.315 0.036 166)` | `#1f372d` | cards, panels, form fields |
| `--surface-raised` | `oklch(0.365 0.040 167)` | | hover, popovers, help widget |
| `--surface-inset` | `oklch(0.205 0.028 164)` | | wells, video letterbox |
| `--line` | `oklch(0.42 0.036 168)` | | default hairline |
| `--line-strong` | `oklch(0.52 0.044 168)` | | emphasised dividers, input borders |
| `--fg` | `oklch(0.97 0.010 160)` | | body — **14.8:1** on `--bg`, 11.8:1 on `--surface` |
| `--fg-muted` | `oklch(0.83 0.020 162)` | | secondary — **9.6:1** / 7.7:1 |
| `--fg-faint` | `oklch(0.70 0.022 163)` | | metadata — **6.1:1** / 4.8:1, never body copy |
| `--on-accent` | `oklch(0.22 0.035 100)` | | on gold — **10.2:1** |
| `--on-brand` | `oklch(0.99 0.005 160)` | | on emerald fill — **5.0:1** |
| `--brand` | `oklch(0.52 0.115 163)` | `#007d55` | emerald fill (darkened so white-on-brand clears 4.5) |
| `--brand-strong` | `oklch(0.44 0.100 164)` | | pressed — on-brand **7.1:1** |
| `--brand-soft` | `oklch(0.33 0.050 165)` | | tinted brand backgrounds |
| `--brand-fg` | `oklch(0.82 0.125 162)` | | brand *as text* — **9.7:1** on `--bg` |
| `--forest` | `oklch(0.36 0.072 158)` | `#13482e` | structural green — footer band |
| `--accent` | `oklch(0.83 0.140 88)` | `#edc14e` | gold — CTA fill only |
| `--accent-strong` | `oklch(0.76 0.145 86)` | | gold hover — on-accent **8.0:1** |
| `--accent-fg` | `oklch(0.86 0.135 89)` | | gold as text — **10.5:1** |
| `--success` / `--success-fg` | `0.62 0.135 155` / `0.84 0.130 155` | | fg **8.2:1** on `--surface` |
| `--warning` / `--warning-fg` | `0.75 0.135 78` / `0.87 0.120 80` | | fg **8.5:1** |
| `--danger` / `--danger-fg` | `0.58 0.185 24` / `0.78 0.150 24` | | fg **5.8:1** |
| `--focus` | `oklch(0.87 0.130 90)` | | focus ring — 2px, 2px offset |

### Light theme (`[data-theme="light"]`)

| Token | OKLCH | Role |
|---|---|---|
| `--bg` | `oklch(0.99 0.004 160)` | `#fafdfb` — crisp white with the faintest green cast |
| `--bg-subtle` | `oklch(0.965 0.008 162)` | alternating band |
| `--surface` | `oklch(1 0 0)` | pure white cards — the "crisp white accent" |
| `--surface-raised` | `oklch(1 0 0)` | same fill, separated by shadow not tone |
| `--surface-inset` | `oklch(0.955 0.010 163)` | |
| `--line` | `oklch(0.90 0.012 165)` | |
| `--line-strong` | `oklch(0.78 0.022 165)` | |
| `--fg` | `oklch(0.28 0.040 165)` | **14.0:1** on `--bg`, 14.4:1 on `--surface` |
| `--fg-muted` | `oklch(0.47 0.034 165)` | **6.6:1** / 6.7:1 |
| `--fg-faint` | `oklch(0.53 0.028 165)` | **4.9:1** — metadata only |
| `--on-accent` | `oklch(0.24 0.040 90)` | **8.2:1** on gold |
| `--on-brand` | `oklch(0.99 0.004 160)` | **6.0:1** on `--brand`, 12.9:1 on `--forest` |
| `--brand` | `oklch(0.48 0.110 163)` | `#00704b` |
| `--brand-strong` | `oklch(0.40 0.100 164)` | on-brand **8.4:1** |
| `--brand-soft` | `oklch(0.94 0.026 163)` | |
| `--brand-fg` | `oklch(0.44 0.108 163)` | **7.1:1** on `--bg` |
| `--forest` | `oklch(0.30 0.068 158)` | |
| `--accent` | `oklch(0.78 0.145 86)` | `#e0b032` |
| `--accent-strong` | `oklch(0.70 0.150 84)` | on-accent **6.1:1** |
| `--accent-fg` | `oklch(0.52 0.130 78)` | gold as text — **5.4:1** |
| `--success-fg` | `oklch(0.44 0.120 155)` | **7.2:1** on `--surface` |
| `--warning-fg` | `oklch(0.50 0.130 70)` | **6.2:1** |
| `--danger-fg` | `oklch(0.50 0.185 25)` | **6.6:1** |
| `--focus` | `oklch(0.52 0.140 80)` | |

### Hero art tokens (do **not** invert)

The hero duotone field is deep green in *both* themes — the duotone is the brand image, and a
light-theme hero would throw away the whole visual idea. So the art surface and the copy on it
carry their own tokens, declared once in `:root` and never overridden:

| Token | OKLCH | Role |
|---|---|---|
| `--art-back` `--art-mid` `--art-fore` | `0.30/0.37/0.44 · 0.050→0.078 · ~160` | the three duotone plies |
| `--art-scrim` | `oklch(0.20 0.034 165 / 0.84)` | contrast guarantee under the headline |
| `--on-art` | `oklch(0.98 0.008 160)` | hero headline — **12.2:1** on `--art-back` |
| `--on-art-muted` | `oklch(0.86 0.020 160)` | hero sub-headline |
| `--on-art-accent` | `oklch(0.86 0.135 89)` | gold hero text |

Hero copy uses `--on-art*`, never `--fg`. Using `--fg` there is a defect.

**Contrast rule:** every body-text pairing is ≥ 4.5:1 in both themes; every large/display
pairing ≥ 3:1. `--fg-faint` is capped to metadata and never carries a sentence a user must
read. Verified per-theme at each phase gate with a measured ratio, not a guess.

### Tailwind utility names

`@theme inline` renames the raw vars into utility namespaces. The mapping:

| Raw var | Utility |
|---|---|
| `--bg` / `--bg-subtle` | `bg-canvas` / `bg-canvas-subtle` |
| `--surface*` | `bg-surface`, `bg-surface-raised`, `bg-surface-inset` |
| `--line` / `--line-strong` | `border-line` / `border-line-strong` |
| `--fg*` | `text-fg`, `text-fg-muted`, `text-fg-faint` |
| everything else | same name (`bg-brand`, `text-accent-fg`, `bg-forest`, `text-on-art`, …) |

Spacing uses Tailwind v4's built-in dynamic scale (`--spacing: 0.25rem`), which already maps
1:1 onto the 8px scale below — `p-2` = 8px, `p-6` = 24px, `p-16` = 64px. No custom spacing
tokens are defined.

**Banned:** warm cream/sand as a default body background. `--bg` is green-neutral in both themes.

---

## Typography

| Token | Value |
|---|---|
| `--font-display` | `"Eczar", Georgia, serif` — hero, page titles, stat figures, wordmark |
| `--font-sans` | `"Archivo", system-ui, sans-serif` — everything else |
| `--font-mono` | `ui-monospace, "SF Mono", monospace` — reference codes, times |

> Replaced the original Fraunces/Inter pair during the polish pass. Both are training-data
> defaults and the serif-display-over-neutral-sans move is the saturated editorial lane.
> Eczar carries a genuine subcontinental typographic lineage for a Karachi conference;
> Archivo is a signage-and-forms grotesque that survives the registration flow.

Loaded via `next/font/google` with `display: 'swap'`; the Geist pair in the scaffold is removed.
Eczar ships at 600/700/800 (the hero headline uses 800); Archivo at 400/500/600/700.

### Scale — fluid via `clamp()`

| Token | Value | Use |
|---|---|---|
| `--text-display` | `clamp(2.75rem, 1.6rem + 5.2vw, 5.25rem)` | hero headline **(max 5.25rem ≤ 6rem cap)** |
| `--text-h1` | `clamp(2.25rem, 1.5rem + 3.2vw, 3.5rem)` | page titles |
| `--text-h2` | `clamp(1.75rem, 1.3rem + 2vw, 2.5rem)` | section headings |
| `--text-h3` | `clamp(1.25rem, 1.1rem + 0.8vw, 1.625rem)` | card titles |
| `--text-lg` | `1.125rem` | lead paragraphs |
| `--text-base` | `1rem` | body |
| `--text-sm` | `0.9375rem` | secondary |
| `--text-xs` | `0.8125rem` | metadata, labels |

### Line height & tracking

| Token | Value |
|---|---|
| `--leading-display` | `0.98` |
| `--leading-tight` | `1.15` |
| `--leading-snug` | `1.35` |
| `--leading-normal` | `1.6` |
| `--leading-relaxed` | `1.75` (long-form prose on About) |
| `--tracking-display` | `-0.018em` — retuned for Eczar; floor is -0.04em |
| `--tracking-tight` | `-0.008em` |
| `--tracking-normal` | `0` |
| `--tracking-wide` | `0.02em` |
| `--tracking-caps` | `0.08em` — small-caps labels *where earned*, not as a reflex eyebrow |

**Measure:** prose columns capped at `--measure: 68ch`; lead paragraphs at `54ch`.

---

## Spacing

8px base, with 2px and 4px steps for control interiors.

| Token | px |
|---|---|
| `--space-3xs` | 2 |
| `--space-2xs` | 4 |
| `--space-xs` | 8 |
| `--space-sm` | 12 |
| `--space-md` | 16 |
| `--space-lg` | 24 |
| `--space-xl` | 32 |
| `--space-2xl` | 48 |
| `--space-3xl` | 64 |
| `--space-4xl` | 96 |
| `--space-5xl` | 128 |

**Section rhythm:** `--section-y: clamp(4rem, 3rem + 5vw, 8rem)` vertical padding on every
top-level section. Consistent rhythm is the single biggest signal of intent — do not vary it
per section without reason.

**Container:** `--container: 1200px`; `--container-narrow: 780px` (prose); gutter
`clamp(1.25rem, 1rem + 2vw, 2.5rem)`.

---

## Radii

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `4px` | badges, tags |
| `--radius-sm` | `8px` | inputs, small buttons |
| `--radius-md` | `12px` | buttons, cards |
| `--radius-lg` | `18px` | large panels, stats bar |
| `--radius-xl` | `28px` | hero art frames |
| `--radius-full` | `999px` | pills, avatars, help widget |

---

## Shadows

Green-tinted, not neutral grey — a grey shadow on an emerald surface reads as dirt.

| Token | Dark | Light |
|---|---|---|
| `--shadow-sm` | `0 1px 2px oklch(0 0 0 / 0.4)` | `0 1px 2px oklch(0.3 0.04 165 / 0.06)` |
| `--shadow-md` | `0 4px 12px oklch(0 0 0 / 0.45)` | `0 4px 12px oklch(0.3 0.04 165 / 0.08)` |
| `--shadow-lg` | `0 12px 32px oklch(0 0 0 / 0.5)` | `0 12px 32px oklch(0.3 0.04 165 / 0.10)` |
| `--shadow-xl` | `0 24px 64px oklch(0 0 0 / 0.55)` | `0 24px 64px oklch(0.3 0.04 165 / 0.12)` |
| `--shadow-accent` | `0 6px 20px oklch(0.82 0.14 88 / 0.28)` | `0 6px 20px oklch(0.76 0.145 86 / 0.30)` |

In light theme the floating stats bar and cards separate from the page by **shadow**, since
`--surface` and `--bg` are near-identical. In dark they separate by **tone**. Both are correct;
neither is a fallback.

---

## Motion

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` — exponential out, the house curve |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--dur-fast` | `140ms` — hover, focus, color |
| `--dur-base` | `260ms` — transforms, disclosure |
| `--dur-slow` | `520ms` — entrance reveals |
| `--stagger` | `70ms` — per-item delay in a staggered group |

Every transition uses `--ease-out` unless it is a two-way toggle, which uses `--ease-in-out`.
`prefers-reduced-motion: reduce` collapses all durations to `1ms` and removes transforms
globally in `@layer base` — plus each animated component provides an explicit static
alternative (see `ui-rules.md`).

---

## Z-index scale

Semantic, never ad-hoc. A raw `z-50` in a component is a defect.

| Token | Value |
|---|---|
| `--z-base` | `0` |
| `--z-raised` | `10` |
| `--z-sticky` | `100` (site header) |
| `--z-dropdown` | `200` (nav submenus, selects) |
| `--z-widget` | `300` (help widget bubble) |
| `--z-modal-backdrop` | `400` |
| `--z-modal` | `500` (mobile nav sheet) |
| `--z-toast` | `600` |
| `--z-tooltip` | `700` |

---

## Layout

| Token | Value |
|---|---|
| `--header-h` | `72px` desktop / `60px` mobile |
| `--hero-min-h` | `clamp(560px, 78vh, 780px)` |
| `--statsbar-overlap` | `-56px` — how far the floating stats bar sits over the hero base |

## Breakpoints

Tailwind defaults, used as-is: `sm 640` `md 768` `lg 1024` `xl 1280` `2xl 1536`.
Design mobile-first; the hero's two-column split engages at `lg`.
