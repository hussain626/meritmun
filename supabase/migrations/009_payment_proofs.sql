-- Payment confirmation now requires the transfer screenshot, and staff can
-- record a discounted amount with a note. Proofs live in a private bucket;
-- only admins and the EB (who confirm payments) can upload or view them.

-- ── Columns ───────────────────────────────────────────────────────────────

alter table public.delegates
  add column if not exists payment_proof_path text,
  add column if not exists payment_note text,
  add column if not exists payment_confirmed_by uuid references public.profiles (id) on delete set null;

alter table public.delegations
  add column if not exists payment_proof_path text,
  add column if not exists payment_note text,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid references public.profiles (id) on delete set null;

-- ── Storage bucket ────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  4194304,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_proofs_staff_insert on storage.objects;
create policy payment_proofs_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and public.is_eb_or_admin());

drop policy if exists payment_proofs_staff_select on storage.objects;
create policy payment_proofs_staff_select on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and public.is_eb_or_admin());

drop policy if exists payment_proofs_staff_delete on storage.objects;
create policy payment_proofs_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-proofs' and public.is_eb_or_admin());
