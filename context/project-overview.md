# MERITMUN III — Project Overview

## What this is

A marketing and registration website for **MERITMUN III**, the third iteration of the
Meritorious Model United Nations conference. It is the conference's public front door:
it sells the experience, explains the committees and agendas, introduces the executive
board, publishes the schedule, and converts visitors into registered delegates or
registered delegations.

This is a **content + conversion site**, not an application. There is no delegate portal,
no committee chat, no document management. The single job of every page is to move a
qualified visitor toward the register form, or to answer the one question that is
blocking them from registering.

## Who it is for

Three audiences, ranked by how much of the site is built for them:

1. **Individual students (14–22)** browsing on a phone, usually at night, deciding whether
   this conference is worth their weekend and their registration fee. They arrive from an
   Instagram link. They want: does this look serious, which committee fits me, what does it
   cost, how do I sign up. They are the primary conversion target.
2. **MUN society heads / faculty coordinators** registering a *delegation* — a block of 5–30
   students from one school or university. They need portfolio-allocation logic, group
   pricing, and a contactable human. Higher value per conversion, lower volume.
3. **Parents and school administrators** doing a legitimacy check. They read About, look at
   the Executive Board, check the venue and dates, and leave. They never register, but they
   grant or withhold permission.

## Problems it solves

- **Legitimacy gap.** Student-run conferences look like student-run conferences. A third
  iteration has earned credibility that a Canva flyer does not communicate. The site must
  read institutional.
- **Committee-choice paralysis.** Delegates cannot pick a committee from a name alone. Each
  committee needs its agenda, difficulty level, and delegate count visible before the
  register form, not buried in a PDF background guide.
- **Two registration paths conflated.** Most MUN sites have one form and a note saying
  "for delegations, email us." That loses the highest-value conversions. Delegation and
  delegate are two first-class, visually distinct paths from the nav down.
- **Dead-end questions.** A visitor with one unanswered question leaves. The floating help
  widget and a real Contact page with named humans catch them.

## Primary user flows

1. **Delegate registration (primary).** Home hero → `Register Now` → Register hub →
   *Register as a Delegate* → 4-step form (Personal → Experience → Committee preferences →
   Review & submit) → confirmation screen with a reference code.
2. **Delegation registration.** Home or nav → Register hub → *Register a Delegation* →
   4-step form (Institution → Head delegate contact → Delegation size & committee spread →
   Review & submit) → confirmation with reference code + next-steps email note.
3. **Committee research.** Home → Committees → filter by difficulty/type → committee detail
   page (agenda, chairs, delegate count, background-guide link) → `Register for this
   committee` CTA that deep-links the delegate form with the committee preselected.
4. **Legitimacy check.** Home → About (story, numbers, venue, past iterations) → Executive
   Board (named people, roles, bios) → leave satisfied.
5. **Schedule scan.** Nav → Schedule → three-day timeline, filterable by day, with venue
   and session type.
6. **Status check.** Hero secondary link → `Register / status` → enter reference code →
   see application status. (Stubbed lookup; see Out of scope.)
7. **Question rescue.** Any page → floating help widget → quick answers + link to Contact.

## In scope

- Seven routes: Home, About, Executive Board, Committees (+ dynamic committee detail),
  Schedule, Contact, Register (+ `/register/delegate`, `/register/delegation`, `/register/status`).
- Full multi-step registration forms with real client-side validation, inline errors,
  progress indication, review step, and a confirmation state.
- Contact form with validation and a success state.
- Committee filtering and detail pages driven by typed local content.
- Dark/light theme toggle as a first-class shipped control, persisted, honoring
  `prefers-color-scheme` on first visit.
- Fully responsive from 360px to 1920px, keyboard-navigable, reduced-motion-safe.
- All hero and section imagery authored as **SVG/CSS in the project's own visual language** —
  duotone architectural skyline, world-flag array, delegate figure collage — because no
  licensed photography is available.
- Loading, empty, and error states for every route that can have them.
- Floating help widget, sticky, dismissible, keyboard-accessible.

## Out of scope

- Any database or persistent storage. Form submissions are validated and handled by a
  server action that logs and returns a generated reference code. Swapping in a real
  backend is a documented seam, not a build task.
- Authentication, delegate dashboards, payment processing, email sending.
- A CMS. All content lives in typed TypeScript modules under `content/`.
- Real status lookup. `/register/status` accepts a reference code and returns a
  deterministic mock status so the flow and its states are fully built and demonstrable.
- Multi-language support.
- Background-guide PDF hosting — committee pages link out to a placeholder URL.

## Assumptions

Every item here was inferred, not stated. These are the things to correct at the review gate.

1. **Conference identity.** MERITMUN III is the third annual iteration. **Host city: Karachi,
   Pakistan** (confirmed by the user). **Dates: TBD** (confirmed by the user) — the site must
   handle an unannounced date as a *designed state*, not a blank. Everywhere a date would
   appear, it renders as "Dates to be announced" with a "Get notified" affordance, and the
   schedule is presented as **Day 1 / Day 2 / Day 3** with times but no calendar dates.
   Assumed duration: three days. Assumed venue: a university auditorium complex, named
   generically as *Meritorious Campus, Main Auditorium Block, Karachi*. South-Asian MUN
   circuit conventions used throughout — "delegation", "portfolio", "chair/vice-chair", "OC",
   "Secretary-General".
2. **Scale.** Assumed 12 committees, ~600 delegate seats, 40+ participating institutions,
   1,800 alumni across MERITMUN I and II. These are the four figures in the floating stats
   bar. All are placeholders and marked as such in `content/stats.ts`.
3. **Committees.** Assumed a realistic 12-committee slate mixing UN bodies (UNSC, UNHRC,
   UNODC, WHO, ECOSOC, DISEC, UNEP), crisis/specialised committees (Historic Crisis,
   Pakistan National Assembly, Joint Crisis), and non-traditional ones (International Press
   Corps, Youth Assembly for beginners). Names, agendas, and difficulty tiers are invented.
4. **Executive Board.** Assumed a Secretariat of 8 (Secretary-General, Deputy SG,
   Director-General, USG Committees, USG Delegate Affairs, USG Marketing, USG Logistics,
   USG Finance). Names are placeholders in the form `[Name — Role]` so they are obviously
   fake and easy to replace.
5. **Pricing.** Assumed PKR-denominated: individual delegate PKR 4,500; delegation rate
   PKR 4,000/head for 5+, PKR 3,500/head for 15+. Displayed but not charged.
6. **Imagery.** Assumed **no photography is available**. The reference image's photographic
   hero (duotone building, flag row, cutout student collage) is reproduced as original
   SVG/CSS artwork. This is the single largest visual assumption — if real photos exist,
   the hero art layer is designed to be swappable.
7. **Aftermovie.** Assumed no real video file. The aftermovie section ships as a fully built
   player shell — poster frame, play affordance, duration, chapter captions — with a
   documented `src` seam. It does not fake playback.
8. **Theme default.** Assumed **dark default** (see the scene sentence in `ui-tokens.md`).
9. **Deployment.** Assumed local dev only for this run; preview on **port 3011**.
10. **Brand.** "MERITMUN" is set as one word, all caps, with the iteration numeral in Roman
    (`MERITMUN III`). No logo asset exists — a wordmark lockup is authored in SVG.
