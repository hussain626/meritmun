# MERITMUN III — Code Standards

The whole codebase must read as if one person wrote it in one sitting.

---

## TypeScript

- `strict: true`. **No `any`.** No `as` casts except where narrowing `FormData` values, and
  those go through a typed helper in `lib/utils.ts` (`getField(fd, name): string`).
- No non-null `!` assertions. If a value can be absent, handle the absence.
- Prefer `type` over `interface` for everything. Consistency beats theology.
- Union string literals over enums (`type Difficulty = 'beginner' | ...`). Enums do not
  survive well through Server/Client boundaries.
- All shared domain types live in `lib/types.ts` and are imported, never redeclared.
- Component props: a named `type XProps = {...}` above the component, exported only if another
  module needs it.
- `satisfies` for content modules so literals stay narrow while being type-checked:
  `export const committees = [...] satisfies Committee[]`.
- Return types are explicit on every exported function in `lib/`. Inferred inside components.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component files | `PascalCase.tsx` | `CommitteeCard.tsx` |
| Non-component modules | `kebab-case.ts` | `validation.ts`, `types.ts` |
| Route folders | `kebab-case` | `app/executive-board/` |
| Components | `PascalCase` | `StatsBar` |
| Functions / vars | `camelCase` | `formatTimeRange` |
| Types | `PascalCase` | `DelegateApplication` |
| Constants | `SCREAMING_SNAKE` only for true module-level constants | `MAX_DELEGATION_SIZE` |
| Booleans | `is/has/can/should` prefix | `isSubmitting`, `hasErrors` |
| Event handlers | `handleX` local, `onX` as a prop | `handleSubmit` / `onStepChange` |
| CSS custom props | `--kebab-case` | `--brand-soft` |

Do not abbreviate. `committee` not `comm`, `delegation` not `deleg`. The one accepted
abbreviation is `abbr` on the Committee type, because that field *is* the abbreviation.

## File structure inside a component

Fixed order, every time:

```tsx
'use client'                 // only if genuinely needed, always line 1
import { ... } from 'react'  // 1. react
import Link from 'next/link' // 2. next
import { Button } from '@/components/ui/Button'  // 3. internal, @/ absolute
import type { Committee } from '@/lib/types'     // 4. type-only imports last

type CommitteeCardProps = { committee: Committee }

export function CommitteeCard({ committee }: CommitteeCardProps) {
  // hooks first, then derived values, then handlers, then render
}
```

- **Named exports only.** No `export default` except where Next.js requires it: `page.tsx`,
  `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Relative imports are banned. Always `@/`.
- One component per file. A tiny private subcomponent may live in the same file *below* the
  main export if it is used nowhere else.
- Files over ~200 lines are a smell — split the section out.

## Styling

- Tailwind utilities only, mapped to tokens. `bg-surface`, `text-muted`, `rounded-md`,
  `shadow-md` — all resolved from `@theme` in `globals.css`.
- **No arbitrary values carrying raw colors or px** (`bg-[#0d3b2e]`, `p-[13px]`). Arbitrary
  values referencing a token are fine where no utility exists:
  `[padding-block:var(--section-y)]`.
- Class lists are composed with `cn()` from `lib/utils.ts` (a `clsx`-style local helper — no
  dependency). Long class strings are grouped in a consistent order:
  layout → box → typography → color → border → effects → state/responsive.
- Conditional variants live in a `const variants = {...}` lookup object above the component,
  never inline ternary soup in `className`.
- Component-scoped keyframes go in `globals.css` under a clearly-commented block, not in
  `<style>` tags.

## Server actions

All in `lib/actions.ts`, one `'use server'` at the top of the file.

```ts
export async function submitDelegate(
  _prev: ActionResult<Submission> | null,
  formData: FormData,
): Promise<ActionResult<Submission>> {
  const values = readDelegateForm(formData)      // typed extraction
  const errors = validateDelegate(values)        // shared validator
  if (hasErrors(errors)) return { ok: false, errors }
  const submission = await persist('delegate', values)   // the backend seam
  return { ok: true, data: submission }
}
```

Rules:
- Signature is always `(prevState, formData)` for `useActionState` compatibility.
- Always return `ActionResult`; **never throw for user error**.
- Never do UI work — no redirects, no `revalidatePath` (nothing is cached), no formatting.
- `persist()` is the only place that touches the outside world. It is currently a logging stub
  and is documented as the swap point.
- Every action is `async` even where nothing awaits — required by the directive.

## Error handling

- **User error** → `ActionResult.errors`, rendered inline at the field.
- **Expected absence** (unknown committee slug, unknown reference code) → a rendered empty or
  not-found state, never an exception. Committee detail uses `notFound()` for a genuinely
  invalid slug.
- **Genuine fault** → thrown, caught by `app/error.tsx`, which shows a recovery UI with a
  `reset()` action and a link home. It never shows a stack trace.
- No empty `catch`. No `console.log` in committed code except the one intentional call inside
  `persist()`, which is commented as the backend seam.

## Accessibility in code

- `aria-*` only when semantics are not already carried by the element. Prefer the right
  element over ARIA on the wrong one.
- Every icon-only control has an `aria-label`; every decorative SVG has `aria-hidden="true"`
  and `focusable="false"`.
- Images (when any exist) always have `alt`; decorative ones get `alt=""`.
- `<Link>` for internal navigation, `<a>` for external with `rel="noreferrer"` on
  `target="_blank"`.

## Content modules

- Data only. No JSX, no functions, no imports beyond `lib/types`.
- Every placeholder value that must be replaced before launch is marked with a
  `// PLACEHOLDER:` comment on its line, so a `grep -rn "PLACEHOLDER"` produces the launch
  checklist.

## Comments

Comments explain **why**, never what. No JSDoc on obvious components. No section-divider ASCII
art. No commented-out code — delete it; git has it.

## Commits

Conventional, imperative, scoped to a build phase:
`feat(hero): stats bar with count-up`, `fix(forms): focus first invalid field`.
Commit at each phase boundary of `build-plan.md`, after the four verification gates pass.
