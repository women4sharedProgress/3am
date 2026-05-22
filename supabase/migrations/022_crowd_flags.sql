-- Crowdsource error flags: one record per user per bill iteration.
-- At 3+ flags the flag becomes visible to all users.
-- Cleared automatically when crowd-verify reaches 3, or by admin action.

create table bill_crowd_flags (
  id         uuid        primary key default gen_random_uuid(),
  bill_id    int         not null,
  account_id uuid        not null,
  iter_hash  text        not null,
  created_at timestamptz not null default now(),
  unique (bill_id, account_id, iter_hash)
);

alter table bill_crowd_flags enable row level security;
create policy "read_all"    on bill_crowd_flags for select using (true);
create policy "service_all" on bill_crowd_flags for all to service_role using (true);

grant select on bill_crowd_flags to anon, authenticated;
grant all    on bill_crowd_flags to service_role;
