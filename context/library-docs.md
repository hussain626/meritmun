# MERITMUN III — Library Docs

How *this* project uses each dependency. Not general documentation — the specific patterns
this codebase commits to. If you are about to use a library in a way not described here,
update this file first.

---

## Next.js 16.3.1 (App Router)

> **Read the bundled docs before writing routing or data code.**
> `node_modules/next/dist/docs/01-app/` — the scaffold's `AGENTS.md` warns that this version
> diverges from training data. Specifically confirm: async `params`/`searchParams`, the
> generated `PageProps<"/route">` / `LayoutProps<"/route">` prop helpers (already used in
> `app/layout.tsx`), and the current `generateMetadata` signature.

**Patterns this project uses:**

- **Server Components by default.** `'use client'` appears only in the files whitelisted in
  `architecture.md`.
- **Static everything.** No `fetch`, no `revalidate`, no dynamic segments beyond
  `committees/[slug]`, which uses `generateStaticParams()` over `content/committees.ts`.
- **Metadata:** a `metadata` export per route. Root layout sets `metadataBase`, a title
  template (`%s · MERITMUN III`), description, and OpenGraph defaults. Committee detail pages
  use `generateMetadata` to build per-committee titles and descriptions.
- **`next/font/google`:** `Fraunces` (weight 700, `axes: ['opsz']`) and `Inter`
  (weights 400/500/600/700), both `display: 'swap'`, exposed as `--font-display` /
  `--font-sans` CSS variables on `<html>`. The scaffold's Geist imports are deleted.
- **Server Actions:** declared in `lib/actions.ts` with a file-level `'use server'`. Passed to
  client form components as props from the route. See `code-standards.md` for the signature.
- **`next/link`:** every internal navigation. Never a bare `<a href="/about">`.
- **`next/image`:** not used in this build — there are no raster assets. If photography is
  added later, it becomes mandatory, with `remotePatterns` configured in `next.config.ts`.
- **`notFound()`** from `next/navigation` for invalid committee slugs.
- **Do not add** `next-themes`, `next-seo`, or any Next.js meta-framework helper. Theme and
  metadata are hand-rolled and small.

## React 19.2.8

- **`useActionState`** is the form primitive for all four forms:
  ```tsx
  const [state, formAction, isPending] = useActionState(action, null)
  ```
  `state` is the `ActionResult`; `isPending` drives the button's loading state.
- **`useId`** for every label/control/error association. Never hand-rolled id strings.
- **No `useEffect` for derived state.** Effects are permitted only for genuine external
  synchronisation: theme `localStorage` write, scroll listener on the header, focus trap,
  body-scroll lock, and the stats count-up rAF loop.
- **`useRef`** for focus management (first invalid field, help-widget return focus).
- No `forwardRef` — React 19 passes `ref` as a normal prop.
- No Suspense boundaries beyond Next.js's own `loading.tsx`.

## Tailwind CSS v4

**v4 is CSS-first. There is no `tailwind.config.js` and none will be created.** Configuration
lives in `app/globals.css`.

- Tokens are declared as plain custom properties on `:root` / `[data-theme="light"]`, then
  exposed to Tailwind via `@theme inline`:
  ```css
  @theme inline {
    --color-bg: var(--bg);
    --color-surface: var(--surface);
    --color-brand: var(--brand);
    --font-display: var(--font-fraunces);
    --radius-md: 12px;
  }
  ```
  `inline` matters: it makes the utilities resolve the variable at use-time, so
  `bg-surface` follows the theme swap without duplicated utility classes.
- **Dark mode is attribute-driven, not `prefers-color-scheme`-driven at the CSS level.** The
  `[data-theme]` selector is the switch; the media query is consulted once, in the no-flash
  script, to pick the initial value. Do not add a `dark:` variant strategy — there is no
  `dark:` prefix anywhere in this codebase. Both themes are expressed purely through token
  values.
- Custom utilities, if genuinely needed, go in `@utility` blocks in `globals.css`. Prefer a
  component class composition via `cn()` instead.
- `@layer base` holds: box-sizing, `html { color-scheme }`, body font/color, heading defaults,
  `:focus-visible`, `::selection`, and the global `prefers-reduced-motion` reset.
- PostCSS is already configured (`@tailwindcss/postcss` in `postcss.config.mjs`). Do not touch it.

## TypeScript / ESLint

- `tsconfig.json` is as scaffolded — `strict: true`, `@/*` path alias to project root. Do not
  loosen it. Do not add `paths` entries; `@/` covers everything.
- `eslint.config.mjs` uses `eslint-config-next` flat config. Run `npm run lint` at every phase
  gate. Do not add plugins. Do not add `eslint-disable` comments — fix the code.
- Verification commands: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Theme implementation (no library)

Hand-rolled, three pieces:

1. **`lib/theme.ts`** exports `THEME_STORAGE_KEY = 'meritmun-theme'` and `THEME_SCRIPT`, a
   minified IIFE string.
2. **Root layout** renders it as `<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />`
   inside `<head>`, before any stylesheet-dependent paint. The script reads `localStorage`,
   falls back to `matchMedia('(prefers-color-scheme: dark)')`, and sets
   `document.documentElement.dataset.theme`. This is the only permitted
   `dangerouslySetInnerHTML` in the codebase.
3. **`ThemeToggle`** (client) reads the current `data-theme` on mount, toggles it, and persists.
   `suppressHydrationWarning` on `<html>` because the script mutates it pre-hydration.

## MCP servers

- **Claude Preview** is the required tool for running and verifying the dev server. A
  `.claude/launch.json` is created in Phase 0:
  ```json
  {
    "version": "0.0.1",
    "configurations": [
      { "name": "meritmun", "runtimeExecutable": "npm",
        "runtimeArgs": ["run", "dev", "--", "--port", "3011"], "port": 3011 }
    ]
  }
  ```
  Use `preview_start` / `preview_snapshot` / `preview_inspect` / `preview_resize` /
  `preview_screenshot` for all verification. **Never** launch the dev server with Bash.
  Both themes are verified with `preview_resize`'s `colorScheme` and by toggling `data-theme`
  via `preview_eval`.
- No other MCP servers are used by this project.

## Explicitly rejected dependencies

Recorded so nobody re-litigates them mid-build.

| Library | Why not |
|---|---|
| `zod` | Four small, fully-known form shapes. A 120-line typed validator module is smaller than the dependency and gives better-shaped errors for this UI. |
| `framer-motion` | All motion here is entrance, hover, and disclosure — CSS transitions and keyframes handle it, with a cleaner reduced-motion story and no client JS cost. |
| `next-themes` | ~30 lines of hand-rolled code, and this project needs the attribute strategy specifically. |
| `clsx` / `tailwind-merge` | `cn()` in `lib/utils.ts` is 8 lines. There is no dynamic class conflict problem here. |
| `lucide-react` / any icon set | Icons are authored to the project's 1.5px stroke; a set would import 900 icons to use 24. |
| `react-hook-form` | `useActionState` + shared validators covers it and keeps the server as the authority. |
| Any UI kit (shadcn, Radix, MUI) | The design system is defined in `ui-tokens.md`/`ui-rules.md`; adopting a kit would mean fighting its defaults on every component. The handful of interactive primitives needed (tabs, disclosure, sheet) are built to spec. |
