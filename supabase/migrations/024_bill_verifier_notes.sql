-- Tier-3+ per-bill verifier notes
-- One note per (bill_id, username); only readable by the author and service_role (admins via edge function).
CREATE TABLE IF NOT EXISTS bill_verifier_notes (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id     integer     NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  username    text        NOT NULL,
  note        text        NOT NULL CHECK (char_length(note) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bill_id, username)
);

ALTER TABLE bill_verifier_notes ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated read: all access goes through edge functions using service_role.
GRANT ALL ON bill_verifier_notes TO service_role;
