# MERITMUN III

## What this is

The marketing and registration website for **MERITMUN III**, the third iteration of the
Meritorious Model United Nations conference — three days, twelve committees, six hundred
seats, in **Karachi, Pakistan**. Dates are **not yet announced**, and the site treats that as
a designed state rather than a gap.

It is a **content + conversion site**, not an application. No delegate portal, no committee
chat, no document management. Every page exists to move a qualified visitor toward the
register form, or to answer the one question blocking them from it.

## Who it is for

1. **Individual students (14–22)** — the primary conversion target. Browsing on a phone, at
   night, from an Instagram link, deciding whether this conference is worth their weekend and
   their fee. They want: does this look serious, which committee fits me, what does it cost,
   how do I sign up.
2. **MUN society heads and faculty coordinators** — registering a *delegation* of 5–30
   students from one institution. Lower volume, much higher value per conversion. They need
   group pricing, a single invoice, and a contactable human.
3. **Parents and school administrators** — doing a legitimacy check. They read About, look at
   the Executive Board, check the venue, and leave. They never register, but they grant or
   withhold permission.

## The problems it solves

- **Legitimacy gap.** Student-run conferences look student-run. A third iteration has earned
  credibility that a Canva flyer does not communicate. The site must read institutional.
- **Committee-choice paralysis.** Nobody can pick a committee from a name alone. Each needs
  its agenda, difficulty tier, and delegate count visible *before* the form, not buried in a PDF.
- **Two registration paths conflated.** Most MUN sites have one form and a note saying "for
  delegations, email us" — which loses the highest-value conversions. Delegation and delegate
  are two first-class, visually distinct paths from the nav down.
- **Dead-end questions.** A visitor with one unanswered question leaves. The floating help
  widget and a Contact page with named humans catch them.

## The register (voice)

Institutional but not stiff. Short declaratives. **Specific over grand** — "twelve committees,
three days, six hundred seats" beats "an unforgettable journey of diplomacy."

- CTAs are verbs with an object: "Register as a delegate", never "Get started" / "Learn more".
- Headings state the thing; they do not tease it.
- Empty and error states say what happened, why, and what to do next. Three sentences maximum,
  with an action.
- **Banned words:** unleash, elevate, seamless, journey, empower, revolutionise, game-changing,
  "in today's world", "more than just a conference".

## Routes

| Route | Job |
|---|---|
| `/` | The pitch. Hero, floating stats bar, value proposition, aftermovie, featured committees, dual CTA. |
| `/about` | Legitimacy. What MUN is, what MERITMUN is, track record, venue. |
| `/executive-board` | Named humans, two tiers, SG featured. The credibility page. |
| `/committees` | Twelve committees, filterable by type and difficulty. |
| `/committees/[slug]` | Agenda, overview, focus points, chairs, seats, and a committee-specific register CTA. |
| `/schedule` | Three days, tabbed, on a real timeline. Dates TBD handled explicitly. |
| `/contact` | Form + direct channels + the eight FAQs. |
| `/register` | The two-path chooser. |
| `/register/delegate` | 4-step application. Accepts `?committee=<slug>` to preselect. |
| `/register/delegation` | 4-step institutional application with live per-head pricing. |
| `/register/status` | Reference-code lookup with a four-stage progress rail. |

## The primary action

**Register.** One gold CTA per view, and never two above the fold. The hero's `Register now`,
the nav's persistent `Register`, and each committee page's `Register for this committee` are
the same funnel. Everything else on any page ranks beneath it.

## Deliberately out of scope

No database, no auth, no payments, no email, no CMS. Form submissions validate on both sides
and return a real reference code; `persist()` in `lib/actions.ts` is the single documented
seam where a backend would attach. `/register/status` returns a deterministic mock so every
state in the flow is built and reachable.

All conference specifics — dates, venue, fees, board names, committee chairs, the four stat
figures — are placeholders. `grep -rn "PLACEHOLDER" content/` is the launch checklist.
