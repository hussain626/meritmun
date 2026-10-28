-- Optional "Reference" on the registration forms: who referred the delegate
-- or delegation (a campus ambassador, team member or friend). Free text.

alter table public.delegates
  add column if not exists referred_by text
    check (referred_by is null or char_length(referred_by) <= 120);

alter table public.delegations
  add column if not exists referred_by text
    check (referred_by is null or char_length(referred_by) <= 120);
