-- Migration 004 seeded a sample three-day running order (placeholder venues,
-- a "delegate dinner", a Joint Crisis session...) that the public Schedule page
-- shows as if it were real. Remove it — but only rows that still match the
-- seed exactly, so anything the secretariat has edited or added is kept.

delete from public.schedule_items as i
using (values
  ('a1111111-1111-1111-1111-111111111111'::uuid, '08:00', '09:30', 'Delegate registration and placard collection'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '09:00', '09:45', 'First-timer briefing'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '10:00', '11:30', 'Opening ceremony'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '11:30', '12:00', 'Tea break'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '12:00', '14:00', 'Committee Session I'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '14:00', '15:00', 'Lunch'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '15:00', '17:30', 'Committee Session II'),
  ('a1111111-1111-1111-1111-111111111111'::uuid, '18:00', '20:00', 'Delegate social'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '08:30', '09:00', 'Daily bulletin distribution'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '09:00', '11:30', 'Committee Session III'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '11:30', '12:00', 'Tea break'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '12:00', '14:00', 'Committee Session IV'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '14:00', '15:00', 'Lunch'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '15:00', '16:00', 'Joint Crisis Committee — joint session'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '15:00', '18:00', 'Committee Session V'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '18:00', '19:00', 'Press conference'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, '19:30', '22:00', 'Delegate dinner'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '09:00', '11:00', 'Committee Session VI'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '11:00', '11:30', 'Tea break'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '11:30', '13:30', 'Voting procedure'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '13:30', '14:30', 'Lunch'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '14:30', '15:30', 'Committee photographs'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, '16:00', '18:00', 'Closing ceremony and awards')
) as seed(day_id, start_time, end_time, title)
where i.day_id = seed.day_id
  and i.start_time = seed.start_time
  and i.end_time = seed.end_time
  and i.title = seed.title;

-- The seeded day headers go too, when nothing real was added under them and
-- their wording is untouched.
delete from public.schedule_days as d
where (d.id, d.label, d.theme) in (
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'Day One', 'Opening and first committee sessions'),
  ('a2222222-2222-2222-2222-222222222222'::uuid, 'Day Two', 'The long day — drafting, crisis, and the press cycle'),
  ('a3333333-3333-3333-3333-333333333333'::uuid, 'Day Three', 'Voting procedure, awards, and close')
)
  and d.date is null
  and not exists (select 1 from public.schedule_items i where i.day_id = d.id)
  -- Attendance cascades with the day; never drop a day that has any.
  and not exists (select 1 from public.delegate_attendance a where a.day_id = d.id);
