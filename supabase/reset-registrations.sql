-- MERITMUN: wipe every registration before launch.
--
-- Clears delegates, delegations, allotments (frees every country), payments
-- and finance records (they live on the registration rows), attendance, merit
-- runs and the email log.
--
-- Keeps admin/EB/reviewer users (profiles + auth), committees, countries
-- (portfolios), allotment rules, pricing, bank accounts, schedule, EB, HODs,
-- secretariat, sponsors and site settings.
--
-- Run once in the Supabase SQL editor. It cannot be undone.

begin;

delete from public.allotments;
delete from public.delegate_attendance;
delete from public.merit_runs;
delete from public.delegates;
delete from public.delegations;
delete from public.email_logs;

-- Help-desk messages. Uncomment to clear the test ones too.
-- delete from public.queries;

-- Delegations take 5 to 10 students.
update public.pricing_settings
   set delegation_min = 5,
       delegation_max = 10,
       updated_at = timezone('utc', now())
 where id = 1;

commit;

-- Should all be 0.
select
  (select count(*) from public.delegates)           as delegates,
  (select count(*) from public.delegations)         as delegations,
  (select count(*) from public.allotments)          as allotments,
  (select count(*) from public.delegate_attendance) as attendance,
  (select count(*) from public.merit_runs)          as merit_runs,
  (select count(*) from public.email_logs)          as email_logs,
  (select count(*) from public.profiles)            as staff_users_kept;
