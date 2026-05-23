-- supabase/migrations/023_ks_support.sql
-- Rename level 'michigan' → 'state' for multi-state support and add Kansas.

-- 1. Rename existing MI state bills
UPDATE bills SET level = 'state' WHERE level = 'michigan';

-- 2. If a CHECK constraint exists on level, drop and recreate it
DO $$
BEGIN
  -- Drop old constraint if present (name may vary)
  ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_level_check;
EXCEPTION WHEN others THEN NULL;
END $$;

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
