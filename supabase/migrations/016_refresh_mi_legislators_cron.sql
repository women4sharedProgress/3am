-- Schedule monthly refresh of Michigan state legislators from OpenStates.
-- Runs on the 1st of each month at 06:00 UTC via pg_cron + pg_net.
--
-- Prerequisites:
--   pg_cron and pg_net extensions must be enabled in the Supabase project.
--   The refresh-mi-legislators edge function must be deployed.

select cron.schedule(
  'refresh-mi-legislators-monthly',        -- job name (unique)
  '0 6 1 * *',                             -- 1st of month, 06:00 UTC
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/refresh-mi-legislators',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body    := '{}'::jsonb
  )
  $$
);
