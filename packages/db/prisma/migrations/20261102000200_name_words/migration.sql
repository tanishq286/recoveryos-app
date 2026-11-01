-- Fuzzy matching moves from the folio table to a vocabulary of distinct name
-- words. A trigram scan over a partition with millions of rows costs tens
-- of milliseconds even when nothing matches, because common trigrams have
-- huge posting lists; the vocabulary is a few hundred thousand words at
-- most. Similar words found there are then looked up exactly in the
-- composite (surname, first name) index.
CREATE TABLE name_words (word text PRIMARY KEY);
INSERT INTO name_words
SELECT DISTINCT w FROM (
  SELECT first_name_norm AS w FROM unclaimed_folios
  UNION SELECT middle_name_norm FROM unclaimed_folios
  UNION SELECT last_name_norm FROM unclaimed_folios
) x
WHERE length(w) > 1
ON CONFLICT DO NOTHING;
CREATE INDEX name_words_word_trgm ON name_words USING gin (word gin_trgm_ops);

CREATE INDEX unclaimed_folios_last_first_norm_idx ON unclaimed_folios (last_name_norm, first_name_norm);
CREATE INDEX unclaimed_folios_first_norm_idx ON unclaimed_folios (first_name_norm);

-- Trigram indexes on the folio table are no longer used by any query, and
-- they were the most expensive indexes to maintain during loads.
DROP INDEX IF EXISTS unclaimed_folios_full_name_trgm;
DROP INDEX IF EXISTS unclaimed_folios_first_name_trgm;
DROP INDEX IF EXISTS unclaimed_folios_middle_name_trgm;
DROP INDEX IF EXISTS unclaimed_folios_last_name_trgm;
