-- Community-driven district lookup table.
-- One row per (zip, submitted_by). Admin-verified rows are used for auto-fill.

create table if not exists district_lookup (
  id                     uuid         primary key default gen_random_uuid(),
  zip                    char(5)      not null,
  state                  char(2),
  county                 text,
  congressional_district text,
  state_senate_district  text,
  state_house_district   text,
  county_commissioner    text,
  jurisdiction           text,
  ward                   text,
  precinct               text,
  village                text,
  circuit_court          text,
  probate_court          text,
  district_court         text,
  school_district        text,
  submitted_by           text         not null,
  verification_count     integer      not null default 0,
  admin_verified         boolean      not null default false,
  created_at             timestamptz  not null default now(),
  updated_at             timestamptz  not null default now(),
  unique (zip, submitted_by)
);

-- One verification row per (lookup_id, username) — prevents duplicate verifications.
create table if not exists district_lookup_verifications (
  id          uuid        primary key default gen_random_uuid(),
  lookup_id   uuid        not null references district_lookup(id) on delete cascade,
  username    text        not null,
  verified_at timestamptz not null default now(),
  unique (lookup_id, username)
);

-- Recalculate verification_count from the actual verifications table.
-- Called after each insert into district_lookup_verifications.
create or replace function increment_district_verification(row_id uuid)
returns void language sql security definer as $$
  update district_lookup
  set verification_count = (
    select count(*) from district_lookup_verifications where lookup_id = row_id
  )
  where id = row_id;
$$;

-- RLS
alter table district_lookup               enable row level security;
alter table district_lookup_verifications enable row level security;

create policy "district_lookup_select" on district_lookup               for select using (true);
create policy "district_lookup_insert" on district_lookup               for insert with check (true);
create policy "district_lookup_update" on district_lookup               for update using (true);
create policy "district_verifs_select" on district_lookup_verifications for select using (true);
create policy "district_verifs_insert" on district_lookup_verifications for insert with check (true);

-- Grants (frontend uses anon key; all auth is handled by httpOnly session cookies)
grant select, insert, update on district_lookup               to anon, authenticated;
grant select, insert         on district_lookup_verifications to anon, authenticated;
grant all                    on district_lookup               to service_role;
grant all                    on district_lookup_verifications to service_role;
grant execute on function increment_district_verification(uuid) to anon, authenticated;
