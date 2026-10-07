-- Registration forms no longer ask for age. Run after 005.

alter table public.delegates
  alter column age drop not null;
