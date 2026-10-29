-- Search and integrity layer that Prisma's schema language cannot express.
-- Applied by `prisma migrate deploy` after the generated init migration.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ── Fuzzy name search ────────────────────────────────────────────────────
-- Trigram GIN indexes back the `%` similarity operator on each name part.
CREATE INDEX unclaimed_folios_full_name_trgm   ON unclaimed_folios USING gin (full_name_norm gin_trgm_ops);
CREATE INDEX unclaimed_folios_first_name_trgm  ON unclaimed_folios USING gin (first_name_norm gin_trgm_ops);
CREATE INDEX unclaimed_folios_middle_name_trgm ON unclaimed_folios USING gin (middle_name_norm gin_trgm_ops);
CREATE INDEX unclaimed_folios_last_name_trgm   ON unclaimed_folios USING gin (last_name_norm gin_trgm_ops);

-- Soundex and Double Metaphone expression indexes, scoped by state, so
-- "Agarwal" finds "Agrawal" even when trigram overlap is low.
CREATE INDEX unclaimed_folios_state_last_soundex   ON unclaimed_folios (state, soundex(last_name_norm));
CREATE INDEX unclaimed_folios_state_first_soundex  ON unclaimed_folios (state, soundex(first_name_norm));
CREATE INDEX unclaimed_folios_state_middle_soundex ON unclaimed_folios (state, soundex(middle_name_norm));
CREATE INDEX unclaimed_folios_state_last_dmetaphone ON unclaimed_folios (state, dmetaphone(last_name_norm));

CREATE INDEX companies_name_trgm ON companies USING gin (name gin_trgm_ops);

-- ── Integrity ────────────────────────────────────────────────────────────
ALTER TABLE recovery_cases
  ADD CONSTRAINT recovery_cases_recover_step_range CHECK (recover_step BETWEEN 1 AND 7),
  ADD CONSTRAINT recovery_cases_fee_pct_range CHECK (agreed_success_fee_pct >= 0 AND agreed_success_fee_pct <= 100),
  -- Filing (step 6) and credit (step 7) need a signed mandate.
  ADD CONSTRAINT recovery_cases_esign_before_filing CHECK (recover_step < 6 OR esign_status = 'SIGNED'),
  -- Credit (step 7) needs the IEPF-5 SRN on record.
  ADD CONSTRAINT recovery_cases_srn_before_credit CHECK (recover_step < 7 OR mca_iepf5_srn IS NOT NULL);

ALTER TABLE unclaimed_folios
  ADD CONSTRAINT unclaimed_folios_shares_non_negative CHECK (original_shares >= 0 AND post_action_shares >= 0),
  ADD CONSTRAINT unclaimed_folios_dividend_non_negative CHECK (unclaimed_dividend_amount >= 0),
  -- The folio column holds ciphertext only (see apps/api/src/common/crypto).
  ADD CONSTRAINT unclaimed_folios_folio_is_ciphertext CHECK (folio_number LIKE 'v1:%');

ALTER TABLE associates
  ADD CONSTRAINT associates_revenue_share_range CHECK (revenue_share_pct >= 0 AND revenue_share_pct <= 100);

ALTER TABLE corporate_actions
  ADD CONSTRAINT corporate_actions_ratio_needed CHECK (
    action_type = 'DIVIDEND' OR (ratio_from > 0 AND ratio_to > 0)
  ),
  ADD CONSTRAINT corporate_actions_dividend_needed CHECK (
    action_type <> 'DIVIDEND' OR dividend_per_share > 0
  );

ALTER TABLE otp_challenges
  ADD CONSTRAINT otp_challenges_attempts_cap CHECK (attempts BETWEEN 0 AND 10);

-- Verified documents must have a stored file.
ALTER TABLE case_documents
  ADD CONSTRAINT case_documents_file_when_uploaded CHECK (status = 'PENDING' OR s3_url IS NOT NULL);

-- ── Append-only audit log ────────────────────────────────────────────────
CREATE FUNCTION audit_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_append_only();
