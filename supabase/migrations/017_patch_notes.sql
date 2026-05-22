-- Patch notes table: written by daily-refresh edge function after each pull.
-- Public read (anon) so the front-end can check for new entries without auth.
-- Writes are service_role only.

create table if not exists patch_notes (
  id         uuid        primary key default gen_random_uuid(),
  pull_date  date        not null default current_date,
  summary    text        not null,
  details    jsonb,
  created_at timestamptz not null default now()
);

alter table patch_notes enable row level security;

create policy "anon read patch_notes"
  on patch_notes for select
  to anon, authenticated
  using (true);

grant select on patch_notes to anon, authenticated;
grant all    on patch_notes to service_role;
