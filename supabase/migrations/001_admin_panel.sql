-- MERITMUN III — Admin panel schema + RLS
-- Source of truth: context/doc/admin-panel.md
--
-- Run this entire file first. Role helpers read public.profiles, so that
-- table is created before get_my_role() / is_admin() / is_staff().

-- Extensions
create extension if not exists "pgcrypto";

-- ── Helpers ───────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ── profiles ──────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'reviewer'
    check (role in ('admin', 'eb', 'reviewer')),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_role text;
begin
  invited_role := coalesce(new.raw_user_meta_data ->> 'role', 'reviewer');
  if invited_role not in ('admin', 'eb', 'reviewer') then
    invited_role := 'reviewer';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    invited_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (after profiles exists — SQL functions resolve tables at CREATE).
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() = 'admin', false);
$$;

create or replace function public.is_eb_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() in ('admin', 'eb'), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() in ('admin', 'eb', 'reviewer'), false);
$$;

-- ── pricing_settings (singleton id = 1) ───────────────────────────────────

create table public.pricing_settings (
  id integer primary key default 1 check (id = 1),
  currency text not null default 'PKR',
  delegate_fee integer not null default 4500,
  delegation_fee integer not null default 0,
  per_delegate_fee integer not null default 4000,
  delegation_min integer not null default 5,
  delegation_max integer not null default 30,
  early_bird_enabled boolean not null default false,
  early_bird_delegate_fee integer,
  early_bird_per_delegate_fee integer,
  early_bird_ends_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

insert into public.pricing_settings (id) values (1)
  on conflict (id) do nothing;

create trigger pricing_settings_set_updated_at
  before update on public.pricing_settings
  for each row execute function public.set_updated_at();

-- ── bank_accounts ─────────────────────────────────────────────────────────

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_title text not null,
  account_number text not null,
  iban text,
  branch text,
  instructions text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- ── committees ────────────────────────────────────────────────────────────

create table public.committees (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  abbr text not null,
  type text not null
    check (type in ('general-assembly', 'specialised', 'crisis', 'press')),
  difficulty text not null
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  hardness_score integer not null default 5
    check (hardness_score between 1 and 10),
  agenda text not null,
  overview text not null default '',
  focus_points jsonb not null default '[]'::jsonb,
  seats integer not null default 0,
  study_guide_path text,
  study_guide_url text,
  featured boolean not null default false,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger committees_set_updated_at
  before update on public.committees
  for each row execute function public.set_updated_at();

-- ── portfolios ────────────────────────────────────────────────────────────

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  country_name text not null,
  is_p5 boolean not null default false,
  hardness integer not null default 5
    check (hardness between 1 and 10),
  notes text,
  is_active boolean not null default true,
  unique (committee_id, country_name)
);

create index portfolios_committee_id_idx on public.portfolios (committee_id);

-- ── delegations ───────────────────────────────────────────────────────────

create table public.delegations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  institution_name text not null,
  institution_city text not null,
  institution_type text not null
    check (institution_type in ('school', 'college', 'university', 'mun-society', 'other')),
  head_name text not null,
  head_email text not null,
  head_phone text not null,
  head_role text not null,
  delegation_size integer not null check (delegation_size >= 1),
  faculty_accompanying boolean not null default false,
  committee_spread jsonb not null default '[]'::jsonb,
  accommodation_count integer not null default 0,
  notes text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'confirmed', 'rejected')),
  payment_amount integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger delegations_set_updated_at
  before update on public.delegations
  for each row execute function public.set_updated_at();

-- ── delegates ─────────────────────────────────────────────────────────────

create table public.delegates (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  delegate_code text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  institution text not null,
  age integer not null,
  city text not null,
  experience text not null
    check (experience in ('first-time', '1-3', '4-9', '10-plus')),
  prior_awards text,
  committee_prefs jsonb not null default '[]'::jsonb,
  accommodation boolean not null default false,
  dietary text,
  hear_about text not null
    check (hear_about in ('instagram', 'school', 'friend', 'alumni', 'other')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'confirmed', 'rejected')),
  payment_amount integer,
  payment_confirmed_at timestamptz,
  payment_rejected_at timestamptz,
  rejection_reason text,
  delegation_id uuid references public.delegations (id) on delete set null,
  fee_type text not null default 'delegate'
    check (fee_type in (
      'delegate',
      'delegation_member',
      'early_bird_delegate',
      'early_bird_delegation_member'
    )),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index delegates_payment_status_idx on public.delegates (payment_status);
create index delegates_delegation_id_idx on public.delegates (delegation_id);

create trigger delegates_set_updated_at
  before update on public.delegates
  for each row execute function public.set_updated_at();

-- ── allotments ────────────────────────────────────────────────────────────

create table public.allotments (
  id uuid primary key default gen_random_uuid(),
  delegate_id uuid not null references public.delegates (id) on delete cascade,
  committee_id uuid not null references public.committees (id) on delete restrict,
  portfolio_id uuid not null references public.portfolios (id) on delete restrict,
  source text not null check (source in ('merit', 'manual')),
  status text not null check (status in ('draft', 'confirmed')),
  rationale text,
  score numeric,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (delegate_id),
  unique (portfolio_id)
);

create trigger allotments_set_updated_at
  before update on public.allotments
  for each row execute function public.set_updated_at();

-- ── eb_members ────────────────────────────────────────────────────────────

create table public.eb_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text not null default '',
  email text,
  photo_path text,
  photo_url text,
  initials text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true
);

-- ── hods ──────────────────────────────────────────────────────────────────

create table public.hods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text not null default '',
  email text,
  photo_path text,
  photo_url text,
  initials text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true
);

-- ── secretariat_members ───────────────────────────────────────────────────

create table public.secretariat_members (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  name text not null,
  role text not null,
  initials text not null,
  sort_order integer not null default 0
);

create index secretariat_members_committee_id_idx
  on public.secretariat_members (committee_id);

-- ── sponsors ──────────────────────────────────────────────────────────────

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,
  logo_url text not null default '',
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- ── queries ───────────────────────────────────────────────────────────────

create table public.queries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null
    check (topic in ('registration', 'delegation', 'sponsorship', 'press', 'other')),
  subject text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'answered', 'archived')),
  reply_body text,
  replied_at timestamptz,
  replied_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index queries_status_idx on public.queries (status);

-- ── email_logs ────────────────────────────────────────────────────────────

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  related_type text,
  related_id uuid,
  provider_id text,
  status text not null default 'sent',
  created_at timestamptz not null default timezone('utc', now())
);

-- ── merit_runs ────────────────────────────────────────────────────────────

create table public.merit_runs (
  id uuid primary key default gen_random_uuid(),
  delegate_id uuid not null references public.delegates (id) on delete cascade,
  status text not null check (status in ('success', 'failed', 'skipped')),
  error text,
  raw_response jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index merit_runs_delegate_id_idx on public.merit_runs (delegate_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Matrix (admin-panel.md):
--   admin    — full on all tables including profiles
--   eb       — full on ops/content; pricing/bank SELECT only; no profiles
--   reviewer — SELECT only on delegates + allotments (+ read-safe KPIs)

alter table public.profiles enable row level security;
alter table public.pricing_settings enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.committees enable row level security;
alter table public.portfolios enable row level security;
alter table public.delegations enable row level security;
alter table public.delegates enable row level security;
alter table public.allotments enable row level security;
alter table public.eb_members enable row level security;
alter table public.hods enable row level security;
alter table public.secretariat_members enable row level security;
alter table public.sponsors enable row level security;
alter table public.queries enable row level security;
alter table public.email_logs enable row level security;
alter table public.merit_runs enable row level security;

-- profiles: admin full; users can read/update own row (non-role fields via app)
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id);

-- pricing: admin write; eb + admin read (reviewer none)
create policy pricing_admin_all on public.pricing_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy pricing_eb_select on public.pricing_settings
  for select using (public.get_my_role() = 'eb');

-- bank: admin write; eb read active context; no reviewer
create policy bank_admin_all on public.bank_accounts
  for all using (public.is_admin()) with check (public.is_admin());

create policy bank_eb_select on public.bank_accounts
  for select using (public.get_my_role() = 'eb');

-- Public-ish content CMS: admin + eb full; anon can read published/active
create policy committees_staff_all on public.committees
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy committees_public_select on public.committees
  for select using (is_published = true);

create policy portfolios_staff_all on public.portfolios
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy portfolios_public_select on public.portfolios
  for select using (
    is_active = true
    and exists (
      select 1 from public.committees c
      where c.id = portfolios.committee_id and c.is_published = true
    )
  );

create policy eb_members_staff_all on public.eb_members
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy eb_members_public_select on public.eb_members
  for select using (is_published = true);

create policy hods_staff_all on public.hods
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy hods_public_select on public.hods
  for select using (is_published = true);

create policy secretariat_staff_all on public.secretariat_members
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy secretariat_public_select on public.secretariat_members
  for select using (true);

create policy sponsors_staff_all on public.sponsors
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy sponsors_public_select on public.sponsors
  for select using (is_active = true);

-- Registrations: admin + eb full; reviewer select
create policy delegates_eb_admin_all on public.delegates
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy delegates_reviewer_select on public.delegates
  for select using (public.get_my_role() = 'reviewer');

create policy delegations_eb_admin_all on public.delegations
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy delegations_reviewer_select on public.delegations
  for select using (public.get_my_role() = 'reviewer');

-- Allotments: admin + eb full; reviewer select
create policy allotments_eb_admin_all on public.allotments
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy allotments_reviewer_select on public.allotments
  for select using (public.get_my_role() = 'reviewer');

-- Queries: admin + eb full (reviewer none)
create policy queries_eb_admin_all on public.queries
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

-- Allow anonymous contact form inserts
create policy queries_anon_insert on public.queries
  for insert
  with check (status = 'open' and reply_body is null);

-- Audit tables: admin + eb
create policy email_logs_eb_admin_all on public.email_logs
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy merit_runs_eb_admin_all on public.merit_runs
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy merit_runs_reviewer_select on public.merit_runs
  for select using (public.get_my_role() = 'reviewer');

-- Public read for active bank accounts (post-registration confirmation screens)
create policy bank_public_active_select on public.bank_accounts
  for select using (is_active = true);

create policy pricing_public_select on public.pricing_settings
  for select using (true);

-- Privileges for PostgREST roles. RLS still filters which rows each role sees.
grant usage on schema public to anon, authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_eb_or_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
