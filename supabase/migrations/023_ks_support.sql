-- supabase/migrations/023_ks_support.sql
-- Rename level 'michigan' → 'state' for multi-state support and add Kansas.

-- 1. Drop old CHECK constraint before updating data
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_level_check;

-- 2. Rename existing MI state bills
UPDATE bills SET level = 'state' WHERE level = 'michigan';

-- 3. Re-add CHECK constraint with updated values
ALTER TABLE bills
  ADD CONSTRAINT bills_level_check
  CHECK (level IN ('federal', 'state', 'local'));

-- 3. Kansas local official roles
INSERT INTO local_official_roles (state, label) VALUES
  ('KS', 'County Sheriff'),
  ('KS', 'County Attorney'),
  ('KS', 'County Clerk'),
  ('KS', 'County Treasurer'),
  ('KS', 'County Commissioner'),
  ('KS', 'Register of Deeds'),
  ('KS', 'Mayor'),
  ('KS', 'Township Trustee'),
  ('KS', 'City Council Member'),
  ('KS', 'City Clerk'),
  ('KS', 'City Treasurer'),
  ('KS', 'School Board Member'),
  ('KS', 'District Court Judge'),
  ('KS', 'District Magistrate Judge'),
  ('KS', 'Community College Board Member')
ON CONFLICT (state, label) DO NOTHING;
