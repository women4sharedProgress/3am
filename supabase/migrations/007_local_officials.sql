-- supabase/migrations/007_local_officials.sql

-- Role reference table
-- Canonical list of valid local official roles per state.
-- Add new states with additional INSERT blocks; no schema change needed.

create table if not exists local_official_roles (
  id    uuid    primary key default gen_random_uuid(),
  state char(2) not null,
  label text    not null,
  unique (state, label)
);

grant select on local_official_roles to anon, authenticated;
grant all    on local_official_roles to service_role;

-- Main table

create table if not exists local_officials (
  id            uuid        primary key default gen_random_uuid(),
  role          text        not null,
  name          text        not null,
  contact_url   text,
  phone         text,
  email         text,
  county        text,
  state         char(2)     not null,
  submitted_by  uuid        references accounts(id),
  created_at    timestamptz not null default now()
);

create index if not exists local_officials_state_county_role_idx
  on local_officials (state, county, role);

alter table local_officials enable row level security;

-- Public read only. All writes go through edge functions using service_role,
-- which bypasses RLS -- no insert/update/delete policy needed here.
drop policy if exists "local_officials_select" on local_officials;
create policy "local_officials_select" on local_officials
  for select using (true);

grant select on local_officials to anon, authenticated;
grant all    on local_officials to service_role;

-- Michigan seed roles

insert into local_official_roles (state, label) values
  ('MI', 'County Sheriff'),
  ('MI', 'County Prosecutor'),
  ('MI', 'County Clerk'),
  ('MI', 'County Treasurer'),
  ('MI', 'County Commissioner'),
  ('MI', 'County Drain Commissioner'),
  ('MI', 'Register of Deeds'),
  ('MI', 'Mayor'),
  ('MI', 'Township Supervisor'),
  ('MI', 'City Council Member'),
  ('MI', 'Township Council Member'),
  ('MI', 'City Clerk'),
  ('MI', 'Township Clerk'),
  ('MI', 'City Treasurer'),
  ('MI', 'Township Treasurer'),
  ('MI', 'School Board Member'),
  ('MI', 'District Court Judge'),
  ('MI', 'Circuit Court Judge'),
  ('MI', 'Community College Board Member')
on conflict (state, label) do nothing;
