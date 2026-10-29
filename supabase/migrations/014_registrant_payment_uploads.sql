-- Registrants upload their transfer screenshot from the private link in their
-- confirmation email (/pay/...). The file goes to the payment-proofs bucket
-- (through the service role) and is attached to the registration, so Finance
-- can confirm the payment without asking for it again.

alter table public.delegates
  add column if not exists payment_proof_uploaded_at timestamptz;

alter table public.delegations
  add column if not exists payment_proof_uploaded_at timestamptz;
