-- Fees now come in two tiers: with social and without social. The existing
-- fee columns are the "with social" prices; these add the "without social"
-- ones, and every delegate records which they chose.
--
-- The UPDATE loads the MERITMUN III fee structure:
--                         with social   without social
--   Early bird individual      2500          2000
--   Early bird delegation      2300          1800   (per delegate)
--   Regular individual         3500          3000
--   Regular delegation         2800          2200   (per delegate)
--   Delegation fee             1000 (once per delegation)
-- Edit them any time on /admin/pricing.

alter table public.pricing_settings
  add column if not exists delegate_fee_no_social integer,
  add column if not exists per_delegate_fee_no_social integer,
  add column if not exists early_bird_delegate_fee_no_social integer,
  add column if not exists early_bird_per_delegate_fee_no_social integer;

alter table public.delegates
  add column if not exists with_social boolean not null default true;

update public.pricing_settings
   set delegate_fee = 3500,
       delegate_fee_no_social = 3000,
       per_delegate_fee = 2800,
       per_delegate_fee_no_social = 2200,
       early_bird_delegate_fee = 2500,
       early_bird_delegate_fee_no_social = 2000,
       early_bird_per_delegate_fee = 2300,
       early_bird_per_delegate_fee_no_social = 1800,
       delegation_fee = 1000,
       updated_at = timezone('utc', now())
 where id = 1;
