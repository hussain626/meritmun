-- Hold allotment emails per committee (e.g. HBCC, HCC). The merit engine and
-- EB still place delegates there, but the seats stay drafts and no allotment
-- email goes out until an admin releases the committee.

alter table public.committees
  add column if not exists allotment_emails_held boolean not null default false;
