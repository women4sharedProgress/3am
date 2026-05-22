-- Schedule weekly refresh of Michigan state bills from LegiScan.
-- Runs every Sunday at 06:00 UTC (1 AM US Eastern) via pg_cron + pg_net.
--
-- Prerequisites:
--   pg_cron and pg_net extensions must be enabled in the Supabase project.
--   The refresh-mi-bills edge function must be deployed.
--   LEGISCAN_API_KEY must be set as a Supabase secret.

select cron.schedule(
  'refresh-mi-bills-weekly',                -- job name (unique)
  '0 6 * * 0',                              -- every Sunday, 06:00 UTC
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/refresh-mi-bills',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body    := '{}'::jsonb
  )
  $$
);
