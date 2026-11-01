-- Phase one of every search: an exact phonetic-key match, answered from a
-- composite index inside the state's partition in about a millisecond, even
-- at tens of millions of rows. Fuzzy (trigram, soundex) matching only runs
-- when this finds too few.
CREATE INDEX IF NOT EXISTS unclaimed_folios_last_first_key_idx
  ON unclaimed_folios (last_name_key, first_name_key, post_action_shares DESC);

-- Daily limits count a member's searches in the audit log.
CREATE INDEX IF NOT EXISTS audit_events_actor_action_created_idx
  ON audit_events (actor_id, action, created_at DESC);
