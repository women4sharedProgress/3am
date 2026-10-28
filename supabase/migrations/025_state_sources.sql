-- supabase/migrations/025_state_sources.sql
-- Control table for the state-refresh edge function: which source each state
-- uses, whether it's on, and how its last run went.
--
-- Run with:  supabase db query --linked --file supabase/migrations/025_state_sources.sql

create table if not exists state_sources (
  state        char(2)     primary key,
  adapter      text        not null default 'legiscan',   -- must match a key in adapters/index.ts
  active       boolean     not null default false,
  notes        text,                                       -- source URL, quirks, contact
  last_run_at  timestamptz,
  last_status  text        check (last_status in ('ok','error')),
  last_error   text,
  last_result  jsonb,
  updated_at   timestamptz not null default now()
);

alter table state_sources enable row level security;
grant all on state_sources to service_role;
-- No anon/authenticated policies: this table is internal.

-- All 50 states, LegiScan by default, OFF until switched on.
insert into state_sources (state) values
  ('AL'),('AK'),('AZ'),('AR'),('CA'),('CO'),('CT'),('DE'),('FL'),('GA'),
  ('HI'),('ID'),('IL'),('IN'),('IA'),('KS'),('KY'),('LA'),('ME'),('MD'),
  ('MA'),('MI'),('MN'),('MS'),('MO'),('MT'),('NE'),('NV'),('NH'),('NJ'),
  ('NM'),('NY'),('NC'),('ND'),('OH'),('OK'),('OR'),('PA'),('RI'),('SC'),
  ('SD'),('TN'),('TX'),('UT'),('VT'),('VA'),('WA'),('WV'),('WI'),('WY')
on conflict (state) do nothing;

-- States already live today stay live (same source they use now)
update state_sources set active = true where state in ('MI','PA');

-- NY uses its official API (turn on after a successful dry run)
update state_sources set adapter = 'ny', notes = 'legislation.nysenate.gov Open Legislation v3' where state = 'NY';

-- Every 10 minutes from 07:00–10:59 UTC (2–6 AM Eastern). Each call handles
-- STATE_BATCH_SIZE overdue states, so 24 calls × 3 = 72 slots for 50 states.
select cron.schedule(
  'state-refresh-nightly',
  '*/10 7-10 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/state-refresh',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  $$
);

-- Health check (run any time):
--   select state, adapter, active, last_status, last_run_at, last_error
--   from state_sources where active order by last_status desc, state;
