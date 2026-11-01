-- Sound-alike matches on surname and first name together, from one B-tree
-- lookup. Separate per-name Double Metaphone indexes return hundreds of
-- thousands of rows each for common names at scale, and intersecting them
-- is what made fuzzy searches slow.
CREATE INDEX IF NOT EXISTS unclaimed_folios_dmetaphone_pair_idx
  ON unclaimed_folios (dmetaphone(last_name_norm), dmetaphone(first_name_norm));
