-- Faster fuzzy search (phase two of every search, see search-engine.ts).

-- Word tokens of the holder's name, for exact word matches from a plain GIN
-- index, which is far cheaper than trigram matching.
ALTER TABLE unclaimed_folios
  ADD COLUMN name_tokens text[]
  GENERATED ALWAYS AS (regexp_split_to_array(lower(full_name_norm), '[^a-z0-9]+')) STORED;
CREATE INDEX unclaimed_folios_name_tokens_idx ON unclaimed_folios USING gin (name_tokens);

-- Double Metaphone replaces four-character Soundex for sound-alike matches.
DROP INDEX IF EXISTS unclaimed_folios_last_soundex;
DROP INDEX IF EXISTS unclaimed_folios_first_soundex;
DROP INDEX IF EXISTS unclaimed_folios_middle_soundex;
CREATE INDEX unclaimed_folios_first_dmetaphone ON unclaimed_folios (dmetaphone(first_name_norm));

-- Surname prefix, for initials and short partial surnames.
CREATE INDEX unclaimed_folios_state_last_prefix_idx ON unclaimed_folios (state, left(last_name_norm, 3));

-- The calculator's equity directory, loaded from the exchanges' published lists.
CREATE TABLE listed_equities (
  exchange text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  isin text,
  series text,
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (exchange, symbol)
);
CREATE INDEX listed_equities_name_trgm ON listed_equities USING gin (name gin_trgm_ops);
