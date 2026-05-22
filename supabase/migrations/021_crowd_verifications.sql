-- Crowdsource verification: one record per user per bill iteration.
-- iter_hash is a client-computed djb2 hash of stage+name+stage_note.
-- When count reaches 3, the edge function sets bills.crowd_verified_hash.

create table bill_crowd_verifications (
  id         uuid        primary key default gen_random_uuid(),
  bill_id    int         not null,
  account_id uuid        not null,
  iter_hash  text        not null,
  created_at timestamptz not null default now(),
  unique (bill_id, account_id, iter_hash)
);

alter table bills add column if not exists crowd_verified_hash text;

alter table bill_crowd_verifications enable row level security;
create policy "read_all"    on bill_crowd_verifications for select using (true);
create policy "service_all" on bill_crowd_verifications for all to service_role using (true);

grant select on bill_crowd_verifications to anon, authenticated;
grant all    on bill_crowd_verifications to service_role;
