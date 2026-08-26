-- Table privileges for PostgREST (anon / authenticated).
-- Run after 001 and 002. RLS still decides which rows each role can see.
-- Without these GRANTs, signed-in users get: permission denied for table profiles.

grant usage on schema public to anon, authenticated;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_eb_or_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated;

grant usage, select on all sequences in schema public
  to anon, authenticated;
