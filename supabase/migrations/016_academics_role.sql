-- Academics: a team role that manages committees (agendas, overviews, study
-- guides, seats and each committee's country list) and the EB. It cannot see
-- registrations, payments, allotments, pricing, queries or the team.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'eb', 'reviewer', 'academics'));

-- Accounts invited from /admin/team carry their role in the auth metadata.
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
  if invited_role not in ('admin', 'eb', 'reviewer', 'academics') then
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

create or replace function public.is_academics()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() = 'academics', false);
$$;

grant execute on function public.is_academics() to authenticated;

drop policy if exists committees_academics_all on public.committees;
create policy committees_academics_all on public.committees
  for all using (public.is_academics()) with check (public.is_academics());

drop policy if exists portfolios_academics_all on public.portfolios;
create policy portfolios_academics_all on public.portfolios
  for all using (public.is_academics()) with check (public.is_academics());

drop policy if exists eb_members_academics_all on public.eb_members;
create policy eb_members_academics_all on public.eb_members
  for all using (public.is_academics()) with check (public.is_academics());
