-- Double-delegate committees (e.g. UNSC): two delegates share one country.
--  * committees.is_double_delegate marks them.
--  * delegates.pair_id is shared by two delegates seated together.
--  * delegates.paid_by points a co-delegate at the registrant who paid for
--    both (an individual who brought their own co-delegate).
--  * allotments may now hold two rows per portfolio in a double-delegate
--    committee, never more, and one row everywhere else (enforced by trigger).
-- Reviewers may also confirm or reject payments.

alter table public.committees
  add column if not exists is_double_delegate boolean not null default false;

alter table public.delegates
  add column if not exists pair_id uuid,
  add column if not exists paid_by uuid references public.delegates (id) on delete set null;

create index if not exists delegates_pair_id_idx on public.delegates (pair_id);
create index if not exists delegates_paid_by_idx on public.delegates (paid_by);

-- ── Seat capacity: 1 per country, 2 in double-delegate committees ──────────

alter table public.allotments drop constraint if exists allotments_portfolio_id_key;
create index if not exists allotments_portfolio_id_idx on public.allotments (portfolio_id);

create or replace function public.enforce_portfolio_capacity()
returns trigger
language plpgsql
as $$
declare
  capacity integer;
  holders integer;
begin
  select case when c.is_double_delegate then 2 else 1 end
    into capacity
    from public.portfolios p
    join public.committees c on c.id = p.committee_id
   where p.id = new.portfolio_id;

  -- Serialise concurrent placements on the same country.
  perform 1 from public.portfolios where id = new.portfolio_id for update;

  select count(*) into holders
    from public.allotments
   where portfolio_id = new.portfolio_id
     and id <> new.id;

  if holders >= coalesce(capacity, 1) then
    raise exception 'portfolio % is full', new.portfolio_id
      using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists allotments_portfolio_capacity on public.allotments;
create trigger allotments_portfolio_capacity
  before insert or update of portfolio_id on public.allotments
  for each row execute function public.enforce_portfolio_capacity();

-- ── Reviewers confirm payments ─────────────────────────────────────────────

drop policy if exists delegates_reviewer_update on public.delegates;
create policy delegates_reviewer_update on public.delegates
  for update using (public.get_my_role() = 'reviewer')
  with check (public.get_my_role() = 'reviewer');

drop policy if exists delegations_reviewer_update on public.delegations;
create policy delegations_reviewer_update on public.delegations
  for update using (public.get_my_role() = 'reviewer')
  with check (public.get_my_role() = 'reviewer');

drop policy if exists payment_proofs_staff_insert on storage.objects;
create policy payment_proofs_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and public.is_staff());

drop policy if exists payment_proofs_staff_select on storage.objects;
create policy payment_proofs_staff_select on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and public.is_staff());

-- Finance needs the name of whoever confirmed a payment.
drop policy if exists profiles_staff_select on public.profiles;
create policy profiles_staff_select on public.profiles
  for select using (public.is_staff());

-- Numbers registrants send their transfer screenshot to (set on /admin/pricing).
alter table public.pricing_settings
  add column if not exists payment_contact_numbers text[] not null default '{}';
