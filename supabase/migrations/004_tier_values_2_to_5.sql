-- Tier 1 = public / no account (no DB row). All account holders start at tier 2.
-- Migrate any existing tier = 1 rows and constrain the column to 2–5.

UPDATE accounts SET tier = 2 WHERE tier = 1;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_tier_check CHECK (tier BETWEEN 2 AND 5);

ALTER TABLE accounts
  ALTER COLUMN tier SET DEFAULT 2;
