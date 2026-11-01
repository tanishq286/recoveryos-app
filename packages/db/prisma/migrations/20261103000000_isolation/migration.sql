-- Pan-India identity and tenant isolation.

-- ── 1. Investor identity fingerprint ────────────────────────────────────
-- Thousands of shareholders share a first and last name, even in one state.
-- A cluster is name + father/spouse + PIN + city + state, so namesakes stay
-- apart. Declared IMMUTABLE: convert_to() and the enum's text form are only
-- "stable" because encodings and enum labels could change in theory; this
-- database is UTF-8 and IndianState labels are never renamed.
CREATE FUNCTION investor_cluster_id(
  full_name text, father_or_spouse text, pincode text, city text, state "IndianState"
) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT encode(sha256(convert_to(
    lower(trim(full_name)) || '|' || lower(trim(coalesce(father_or_spouse, ''))) || '|' ||
    coalesce(pincode, '') || '|' || lower(trim(coalesce(city, ''))) || '|' || state::text,
    'UTF8')), 'hex')
$$;

ALTER TABLE unclaimed_folios
  ADD COLUMN investor_cluster_id text GENERATED ALWAYS AS (
    investor_cluster_id(investor_full_name, father_or_spouse_name, pincode, city, state)
  ) STORED;
CREATE INDEX unclaimed_folios_investor_cluster_idx ON unclaimed_folios (investor_cluster_id);

-- ── 2. Legacy ISINs (pre-split identifiers on old IEPF statements) ──────
ALTER TABLE companies ADD COLUMN legacy_isins text[] NOT NULL DEFAULT '{}';
CREATE INDEX companies_legacy_isins_idx ON companies USING gin (legacy_isins);

-- ── 3. Claim locks and duplicate-claimant review ────────────────────────
ALTER TABLE leads_and_inquiries ADD COLUMN review_alert text;
ALTER TABLE leads_and_inquiries ADD CONSTRAINT leads_review_alert_known
  CHECK (review_alert IS NULL OR review_alert IN ('DUPLICATE_CLAIMANT_REVIEW'));
-- One case per holding per client; a second claimant becomes a flagged lead.
CREATE UNIQUE INDEX recovery_cases_folio_client_key
  ON recovery_cases (folio_id, client_user_id) WHERE folio_id IS NOT NULL;

-- ── 4. Row-level security for client reads ──────────────────────────────
-- The API reads a client's own records as finsol_app_client with
-- app.user_id set for the transaction (see cases.service.ts). The table
-- owner (staff paths, migrations) is unaffected; this role sees only rows
-- that belong to the signed-in user, whatever the application code asks for.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finsol_app_client') THEN
    CREATE ROLE finsol_app_client NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO finsol_app_client;
GRANT SELECT ON recovery_cases, case_documents, leads_and_inquiries, valuation_reports,
  case_events, companies, unclaimed_folios, users, associates TO finsol_app_client;

CREATE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;
GRANT EXECUTE ON FUNCTION app_user_id() TO finsol_app_client;

ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_and_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_cases_own ON recovery_cases FOR SELECT TO finsol_app_client
  USING (
    client_user_id = app_user_id()
    OR associate_id IN (SELECT id FROM associates WHERE user_id = app_user_id())
  );
CREATE POLICY case_documents_own ON case_documents FOR SELECT TO finsol_app_client
  USING (case_id IN (SELECT id FROM recovery_cases));
CREATE POLICY leads_own ON leads_and_inquiries FOR SELECT TO finsol_app_client
  USING (phone = (SELECT phone FROM users WHERE id = app_user_id()));
CREATE POLICY valuation_reports_own ON valuation_reports FOR SELECT TO finsol_app_client
  USING (user_id = app_user_id());

-- ── 5. Cache warming after restarts ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_prewarm;
