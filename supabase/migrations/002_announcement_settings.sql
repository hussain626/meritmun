-- Homepage announcement bar (singleton id = 1)
-- Run AFTER 001_admin_panel.sql (needs set_updated_at, profiles, RLS helpers).

create table public.announcement_settings (
  id integer primary key default 1 check (id = 1),
  is_active boolean not null default false,
  message text not null default '',
  link_type text not null default 'none'
    check (link_type in ('none', 'internal', 'external')),
  internal_path text
    check (
      internal_path is null
      or (
        internal_path like '/%'
        and internal_path not like '//%'
      )
    ),
  external_url text,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

insert into public.announcement_settings (id) values (1)
  on conflict (id) do nothing;

create trigger announcement_settings_set_updated_at
  before update on public.announcement_settings
  for each row execute function public.set_updated_at();

alter table public.announcement_settings enable row level security;

-- Admin + EB can edit; reviewer can read (Overview is shared).
create policy announcement_eb_admin_all on public.announcement_settings
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy announcement_staff_select on public.announcement_settings
  for select using (public.is_staff());

-- Public site only reads an active bar.
create policy announcement_public_select on public.announcement_settings
  for select using (is_active = true);

grant select, insert, update, delete on table public.announcement_settings
  to anon, authenticated;
