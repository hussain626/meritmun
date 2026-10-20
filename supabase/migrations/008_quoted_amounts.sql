-- The fee quoted at registration (and emailed with the bank details) is the
-- amount Finance confirms. Before this, payment_amount was recomputed from the
-- pricing in force at confirmation time, so a fee edit in between changed what
-- a delegate owed after they had been told a number.

alter table public.delegates
  add column if not exists quoted_amount integer;

alter table public.delegations
  add column if not exists quoted_amount integer;
