-- Allotment system: rules, committee pause, allotment email tracking,
-- delegation member rosters, attendance, and public registration inserts.
-- Run after 001–004.

-- ── committees: pause the merit engine per committee ──────────────────────
-- A paused committee is skipped by the merit engine; EB can still place
-- delegates there manually.

alter table public.committees
  add column if not exists allotments_paused boolean not null default false;

-- ── delegates: head-of-delegation flag ────────────────────────────────────

alter table public.delegates
  add column if not exists is_head_delegate boolean not null default false;

create index if not exists delegates_email_lower_idx
  on public.delegates (lower(email));

-- ── allotments: email tracking ────────────────────────────────────────────
-- `email_sent_at` is null until the allotment email reaches the delegate,
-- so "Issue allotments" can retry failed sends.

alter table public.allotments
  add column if not exists email_sent_at timestamptz;

-- ── allotment_rules (singleton id = 1) ────────────────────────────────────

create table if not exists public.allotment_rules (
  id integer primary key default 1 check (id = 1),
  -- Delegates scoring below this (0–100) are not auto-placed in advanced committees.
  advanced_min_score integer not null default 40
    check (advanced_min_score between 0 and 100),
  -- Intermediate committees gate (0 = no gate).
  intermediate_min_score integer not null default 0
    check (intermediate_min_score between 0 and 100),
  -- How many of the delegate's ranked committee preferences to honour (1–3).
  preference_depth integer not null default 3
    check (preference_depth between 1 and 3),
  -- When no preference has room: 'emptiest' places in the committee with most
  -- free seats; 'none' leaves the delegate for EB to place by hand.
  fallback_mode text not null default 'emptiest'
    check (fallback_mode in ('emptiest', 'none')),
  -- Max members of one delegation the engine may seat in the same committee
  -- (0 = no cap).
  delegation_committee_cap integer not null default 0
    check (delegation_committee_cap between 0 and 50),
  -- Match portfolio hardness to merit (strong delegates get harder seats).
  match_hardness boolean not null default true,
  -- Score free-text experience with Gemini when GEMINI_API_KEY is set.
  use_ai_scoring boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

insert into public.allotment_rules (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists allotment_rules_set_updated_at on public.allotment_rules;
create trigger allotment_rules_set_updated_at
  before update on public.allotment_rules
  for each row execute function public.set_updated_at();

alter table public.allotment_rules enable row level security;

drop policy if exists allotment_rules_staff_all on public.allotment_rules;
create policy allotment_rules_staff_all on public.allotment_rules
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

drop policy if exists allotment_rules_reviewer_select on public.allotment_rules;
create policy allotment_rules_reviewer_select on public.allotment_rules
  for select using (public.get_my_role() = 'reviewer');

-- ── delegate_attendance ───────────────────────────────────────────────────
-- One row per delegate per conference day = present. No row = absent.

create table if not exists public.delegate_attendance (
  delegate_id uuid not null references public.delegates (id) on delete cascade,
  day_id uuid not null references public.schedule_days (id) on delete cascade,
  marked_at timestamptz not null default timezone('utc', now()),
  marked_by uuid references public.profiles (id),
  primary key (delegate_id, day_id)
);

alter table public.delegate_attendance enable row level security;

drop policy if exists delegate_attendance_staff_all on public.delegate_attendance;
create policy delegate_attendance_staff_all on public.delegate_attendance
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

drop policy if exists delegate_attendance_reviewer_select on public.delegate_attendance;
create policy delegate_attendance_reviewer_select on public.delegate_attendance
  for select using (public.get_my_role() = 'reviewer');

-- ── Public registration inserts ───────────────────────────────────────────
-- The registration server action prefers the service-role client; these
-- policies let it fall back to the anon client. Inserts only — anon can never
-- read registrations back, and only as unpaid rows.

drop policy if exists delegates_public_insert on public.delegates;
create policy delegates_public_insert on public.delegates
  for insert
  with check (
    payment_status = 'pending'
    and payment_amount is null
    and payment_confirmed_at is null
  );

drop policy if exists delegations_public_insert on public.delegations;
create policy delegations_public_insert on public.delegations
  for insert
  with check (payment_status = 'pending' and payment_amount is null);

grant select, insert, update, delete on table public.allotment_rules to anon, authenticated;
grant select, insert, update, delete on table public.delegate_attendance to anon, authenticated;
