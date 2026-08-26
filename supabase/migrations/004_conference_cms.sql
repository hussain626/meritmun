-- Conference settings (registration gate) + editable public schedule.
-- Run after 001–003.

-- ── conference_settings (singleton id = 1) ────────────────────────────────

create table public.conference_settings (
  id integer primary key default 1 check (id = 1),
  registration_open boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

insert into public.conference_settings (id, registration_open)
values (1, false)
on conflict (id) do nothing;

create trigger conference_settings_set_updated_at
  before update on public.conference_settings
  for each row execute function public.set_updated_at();

alter table public.conference_settings enable row level security;

create policy conference_settings_public_select on public.conference_settings
  for select using (true);

create policy conference_settings_staff_all on public.conference_settings
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

-- ── schedule ──────────────────────────────────────────────────────────────

create table public.schedule_days (
  id uuid primary key default gen_random_uuid(),
  date date,
  label text not null,
  theme text not null default '',
  sort_order integer not null default 0
);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.schedule_days (id) on delete cascade,
  start_time text not null,
  end_time text not null,
  title text not null,
  kind text not null
    check (kind in ('ceremony', 'session', 'break', 'social', 'logistics')),
  venue text not null default '',
  description text,
  sort_order integer not null default 0
);

create index schedule_items_day_id_idx on public.schedule_items (day_id);

alter table public.schedule_days enable row level security;
alter table public.schedule_items enable row level security;

create policy schedule_days_public_select on public.schedule_days
  for select using (true);
create policy schedule_days_staff_all on public.schedule_days
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

create policy schedule_items_public_select on public.schedule_items
  for select using (true);
create policy schedule_items_staff_all on public.schedule_items
  for all using (public.is_eb_or_admin()) with check (public.is_eb_or_admin());

grant select, insert, update, delete on table public.conference_settings
  to anon, authenticated;
grant select, insert, update, delete on table public.schedule_days
  to anon, authenticated;
grant select, insert, update, delete on table public.schedule_items
  to anon, authenticated;

-- Default three-day running order (editable in /admin/schedule).
insert into public.schedule_days (id, date, label, theme, sort_order) values
  ('a1111111-1111-1111-1111-111111111111', null, 'Day One', 'Opening and first committee sessions', 1),
  ('a2222222-2222-2222-2222-222222222222', null, 'Day Two', 'The long day — drafting, crisis, and the press cycle', 2),
  ('a3333333-3333-3333-3333-333333333333', null, 'Day Three', 'Voting procedure, awards, and close', 3)
on conflict (id) do nothing;

insert into public.schedule_items (day_id, start_time, end_time, title, kind, venue, description, sort_order)
select * from (values
  ('a1111111-1111-1111-1111-111111111111'::uuid, '08:00', '09:30', 'Delegate registration and placard collection', 'logistics', 'Main Auditorium Foyer', 'Bring photo ID and your reference code. Head delegates collect for the whole delegation at the institutional desk.', 1),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '09:00', '09:45', 'First-timer briefing', 'logistics', 'Seminar Hall B', 'Rules of procedure, the speakers'' list, and how a working paper is written. Optional, and worth it.', 2),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '10:00', '11:30', 'Opening ceremony', 'ceremony', 'Main Auditorium', 'Address from the Secretary-General, keynote, and the roll call of participating institutions.', 3),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '11:30', '12:00', 'Tea break', 'break', 'Central Courtyard', null, 4),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '12:00', '14:00', 'Committee Session I', 'session', 'Allocated committee rooms', 'Roll call, setting the agenda, and opening speeches. Crisis committees begin with their first directive window.', 5),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '14:00', '15:00', 'Lunch', 'break', 'Dining Hall', 'Vegetarian and allergen-aware options are labelled at the counter.', 6),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '15:00', '17:30', 'Committee Session II', 'session', 'Allocated committee rooms', 'Moderated and unmoderated caucus. Working paper blocs typically form here.', 7),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '18:00', '20:00', 'Delegate social', 'social', 'Central Courtyard', 'Informal, and the single best place to find your bloc before day two.', 8),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '08:30', '09:00', 'Daily bulletin distribution', 'logistics', 'Main Auditorium Foyer', 'Filed overnight by the International Press Corps.', 1),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '09:00', '11:30', 'Committee Session III', 'session', 'Allocated committee rooms', 'Draft resolutions and working papers submitted to the dais for approval.', 2),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '11:30', '12:00', 'Tea break', 'break', 'Central Courtyard', null, 3),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '12:00', '14:00', 'Committee Session IV', 'session', 'Allocated committee rooms', 'Formal debate on approved drafts. Crisis committees run their second escalation.', 4),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '14:00', '15:00', 'Lunch', 'break', 'Dining Hall', null, 5),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '15:00', '16:00', 'Joint Crisis Committee — joint session', 'session', 'Main Auditorium', 'Both JCC cabinets in one room. Open to observers from other committees.', 6),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '15:00', '18:00', 'Committee Session V', 'session', 'Allocated committee rooms', 'The longest block of the conference. Amendments, and the last chance to move a bloc.', 7),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '18:00', '19:00', 'Press conference', 'session', 'Seminar Hall A', 'Committee chairs and selected delegates take questions from the Press Corps.', 8),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '19:30', '22:00', 'Delegate dinner', 'social', 'Off-site — coach transport provided', 'Included in the registration fee. Coaches leave from the main gate at 19:15.', 9),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '09:00', '11:00', 'Committee Session VI', 'session', 'Allocated committee rooms', 'Final debate. Amendments close thirty minutes before the session ends.', 1),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '11:00', '11:30', 'Tea break', 'break', 'Central Courtyard', null, 2),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '11:30', '13:30', 'Voting procedure', 'session', 'Allocated committee rooms', 'Doors are sealed. No entry or exit once voting procedure has been declared.', 3),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '13:30', '14:30', 'Lunch', 'break', 'Dining Hall', null, 4),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '14:30', '15:30', 'Committee photographs', 'logistics', 'Central Courtyard', 'By committee, in the order posted on the foyer board.', 5),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '16:00', '18:00', 'Closing ceremony and awards', 'ceremony', 'Main Auditorium', 'Best Delegate, High Commendation, and Honourable Mention per committee, plus the Best Delegation award.', 6)
) as seed(day_id, start_time, end_time, title, kind, venue, description, sort_order)
where not exists (select 1 from public.schedule_items);
