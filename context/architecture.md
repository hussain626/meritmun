# MERITMUN III — Architecture

## Stack

Already scaffolded and committed (`c8f2f82`). Do not re-init, do not swap.

| Layer | Choice | Version | Why |
|---|---|---|---|
| Framework | Next.js App Router | 16.3.1 | Already present. Server Components by default keeps the marketing pages zero-JS. |
| Runtime | React | 19.2.8 | Ships with the scaffold. `useActionState` is the form primitive. |
| Language | TypeScript | ^5, `strict: true` | Non-negotiable. No `any`. |
| Styling | Tailwind CSS | v4 (`@tailwindcss/postcss`) | v4 is CSS-first: tokens live in `@theme`, not a JS config. There is no `tailwind.config.js` and none will be created. |
| Fonts | `next/font/google` | — | Already wired for Geist; will be replaced (see `ui-tokens.md`). |
| Validation | Hand-written validators in `lib/validation.ts` | — | Zod is not a dependency and will not be added. The form shapes are small and fully known; a 120-line typed validator module beats a dependency. |
| Icons | Local SVG components in `components/icons/` | — | No icon library. Every icon is authored to the project's stroke weight. |
| State | React `useState` / `useActionState` / one context for theme | — | No state library. Nothing in this site justifies one. |

**No new runtime dependencies may be added without recording the reason here first.**

> ⚠️ Next.js 16 differs from training data. Before writing routing, metadata, server-action,
> or `params`/`searchParams` code, read the relevant guide under
> `node_modules/next/dist/docs/01-app/`. In particular: `params` and `searchParams` are
> async (`await params`), and layout/page prop types come from the generated
> `LayoutProps<"/route">` / `PageProps<"/route">` helpers — see the existing `app/layout.tsx`.

## Folder structure

```
app/
  layout.tsx                  root shell: fonts, theme script, header, footer, help widget
  globals.css                 @import tailwindcss + @theme tokens + base layer
  page.tsx                    Home
  about/page.tsx
  executive-board/page.tsx
  committees/page.tsx
  committees/[slug]/page.tsx  + generateStaticParams + generateMetadata
  schedule/page.tsx
  contact/page.tsx
  register/page.tsx           hub: two-path chooser
  register/delegate/page.tsx
  register/delegation/page.tsx
  register/status/page.tsx
  not-found.tsx
  error.tsx                   client error boundary
  loading.tsx                 route-level fallback
components/
  layout/       SiteHeader, SiteFooter, MobileNav, ThemeToggle, HelpWidget
  ui/           Button, Card, Badge, Input, Select, Textarea, Field, Stepper,
                SectionHeading, Disclosure, Tabs, Alert, Skeleton, EmptyState
  home/         Hero, HeroArt, FlagArray, StatsBar, ValueProp, Aftermovie
  committees/   CommitteeCard, CommitteeFilters, CommitteeDetail
  board/        BoardMemberCard
  schedule/     ScheduleTimeline, DayTabs, ScheduleItem
  forms/        DelegateForm, DelegationForm, ContactForm, StatusLookupForm,
                FormStep, FormSummary, SubmissionResult
  icons/        one file per icon, named export
content/
  site.ts       nav structure, conference meta, contact details, socials
  stats.ts      the four hero stat figures
  committees.ts typed committee slate
  board.ts      typed executive board
  schedule.ts   typed three-day schedule
  faq.ts        help-widget + contact-page Q&A
lib/
  types.ts      shared domain types
  validation.ts field validators + form-level validate functions
  actions.ts    'use server' — submitDelegate, submitDelegation, submitContact, lookupStatus
  utils.ts      cn(), formatters, slugify, reference-code generator
  theme.ts      theme constants + the inline no-flash script string
context/        these nine files
public/         favicon + any static assets
```

## System boundaries

Four layers. Dependencies point downward only.

```
app/*           routes: compose sections, own metadata, own nothing else
  ↓
components/*    presentation. Receive data as props. Never import from content/ or lib/actions.
  ↓
lib/*           domain logic: types, validation, server actions, utilities
  ↓
content/*       typed data modules. Import nothing but lib/types.
```

### Hard constraints

1. **Components never import from `content/`.** Route files read content and pass it down as
   props. This keeps every component independently previewable and testable, and it is what
   makes swapping in a CMS later a one-file change per route.
2. **Components never import `lib/actions`.** Server actions are passed to form components as
   props, or the form component is rendered by a route that binds the action. The one
   exception: `components/forms/*` may import the action type, never the implementation.
3. **Server Components by default.** `'use client'` is a deliberate act. It is permitted only
   in: `ThemeToggle`, `HelpWidget`, `MobileNav`, `CommitteeFilters`, `DayTabs`, `Tabs`,
   `Disclosure`, `app/error.tsx`, and everything under `components/forms/`. If a new file
   needs it, justify it in this document first.
4. **No data fetching in components.** There is no database. `content/` modules are imported
   at the route level and are statically analysable.
5. **Server actions return a discriminated result, never throw for user error.**
   `type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors; message?: string }`.
   Thrown errors are reserved for genuine faults and are caught by `app/error.tsx`.
6. **Validation runs on both sides from the same module.** `lib/validation.ts` is imported by
   the client form (for inline feedback) and by the server action (as the authority). One
   source of truth, no drift.
7. **No hard-coded colors, spacing, radii, or shadows in any component.** Every value is a
   token from `ui-tokens.md`, consumed via a Tailwind utility that maps to a CSS variable.
   A literal hex code in a `.tsx` file is a build defect.
8. **All routes are statically rendered.** Nothing is dynamic; committee detail pages use
   `generateStaticParams`. If a route needs to opt out, record why here.

## Data flow

**Read path (every page but the forms):**
`content/*.ts` → route Server Component → section components as props → rendered HTML.
Fully static, zero client JS except the islands listed in constraint 3.

**Write path (all four forms):**
```
Client form (useActionState)
  → client-side validate() on blur/submit for instant inline errors
  → server action invoked with FormData
      → validate() again (authoritative)
      → on failure: return { ok:false, errors } → rendered inline, focus moves to first error
      → on success: generate reference code, log, return { ok:true, data }
  → component swaps to <SubmissionResult /> — no navigation, no redirect
```
The persistence seam is the single `persist()` call inside each action in `lib/actions.ts`.
Today it logs. That function is the only thing a real backend needs to replace.

**Theme flow:**
An inline blocking script in `<head>` reads `localStorage.meritmun-theme`, falls back to
`prefers-color-scheme`, and sets `data-theme` on `<html>` before first paint — no flash.
`ThemeToggle` is a client component that writes both `data-theme` and `localStorage`.

## Schemas

No database. These are the TypeScript shapes in `lib/types.ts` that govern content and forms.
They are written as if they were table definitions so a future backend is a transcription.

```ts
type Difficulty = 'beginner' | 'intermediate' | 'advanced'
type CommitteeType = 'general-assembly' | 'specialised' | 'crisis' | 'press'

Committee {
  slug: string            // PK, url-safe
  name: string            // "United Nations Security Council"
  abbr: string            // "UNSC"
  type: CommitteeType
  difficulty: Difficulty
  agenda: string          // the single topic under discussion
  overview: string        // 2–3 sentence pitch
  focusPoints: string[]   // 3–5 bullets shown on the detail page
  seats: number
  chairs: { name: string; role: 'Chair' | 'Vice Chair' | 'Director' }[]
  backgroundGuideUrl: string | null
}

BoardMember {
  id: string
  name: string
  role: string            // "Secretary-General"
  tier: 'secretariat' | 'directorate'
  bio: string
  initials: string        // drives the generated avatar
  email: string | null
}

// Dates are TBD. `date` is nullable by design and every consumer must render the
// "to be announced" state rather than a placeholder date string.
ScheduleDay { id: 'day-1'|'day-2'|'day-3'; date: string | null; label: string; theme: string; items: ScheduleItem[] }
ScheduleItem {
  id: string
  start: string           // "09:30"
  end: string
  title: string
  kind: 'ceremony' | 'session' | 'break' | 'social' | 'logistics'
  venue: string
  description: string | null
}

DelegateApplication {
  fullName, email, phone, institution: string
  age: number
  city: string
  experience: 'first-time' | '1-3' | '4-9' | '10-plus'
  priorAwards: string | null
  committeePrefs: [string, string, string]   // committee slugs, ranked, must be distinct
  accommodation: boolean
  dietary: string | null
  hearAbout: 'instagram' | 'school' | 'friend' | 'alumni' | 'other'
  consent: true
}

DelegationApplication {
  institutionName, institutionCity, institutionType: string
  headName, headEmail, headPhone, headRole: string
  delegationSize: number         // 5..30
  facultyAccompanying: boolean
  committeeSpread: string[]      // 1..n committee slugs of interest
  accommodationCount: number
  notes: string | null
  consent: true
}

ContactMessage { name, email, subject, message: string; topic: 'registration'|'delegation'|'sponsorship'|'press'|'other' }

Submission { reference: string /* MMIII-XXXXXX */; kind: 'delegate'|'delegation'|'contact'; receivedAt: string }
StatusResult { reference: string; status: 'received'|'under-review'|'allocated'|'confirmed'|'not-found'; committee?: string; note: string }
```

## Verification gates

The build is not "done" at a phase boundary until all four pass:

1. `npx tsc --noEmit` — clean.
2. `npm run lint` — clean.
3. `npm run build` — succeeds, no route errors.
4. The phase's screens render correctly at 375px / 768px / 1440px **in both themes**.
