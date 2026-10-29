-- Real-data upgrade: live prices, verified company contacts, statement fields.
-- Fictional seed rows are not migrated: run `npm run db:reset` (local) to
-- rebuild from the verified catalogue.

-- Companies: prices come only from the market sync, contacts are verified.
ALTER TABLE companies
  DROP COLUMN IF EXISTS price_as_of,
  ADD COLUMN statutory_basis text,
  ADD COLUMN price_updated_at timestamptz(6),
  ADD COLUMN price_source text,
  ADD COLUMN rta_display_name text,
  ADD COLUMN rta_email text,
  ADD COLUMN rta_phone text,
  ADD COLUMN rta_website text,
  ADD COLUMN nodal_officer_phone text,
  ADD COLUMN deputy_nodal_officers jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN ir_page_url text,
  ADD COLUMN contacts_source text;

-- No company without a nodal officer.
UPDATE companies SET nodal_officer_name = 'Company Secretary (IEPF Nodal Officer)' WHERE nodal_officer_name IS NULL;
ALTER TABLE companies ALTER COLUMN nodal_officer_name SET NOT NULL;
ALTER TABLE companies ADD CONSTRAINT companies_cin_or_statute CHECK (cin IS NOT NULL OR statutory_basis IS NOT NULL);
ALTER TABLE companies ADD CONSTRAINT companies_price_has_provenance
  CHECK (current_market_price IS NULL OR (price_updated_at IS NOT NULL AND price_source IS NOT NULL));

ALTER TABLE corporate_actions ADD COLUMN source text;
ALTER TABLE corporate_actions DROP CONSTRAINT corporate_actions_dividend_needed;
ALTER TABLE corporate_actions ADD CONSTRAINT corporate_actions_cash_needed
  CHECK (action_type NOT IN ('DIVIDEND', 'CASH_ENTITLEMENT') OR dividend_per_share > 0);
ALTER TABLE corporate_actions DROP CONSTRAINT corporate_actions_ratio_needed;
ALTER TABLE corporate_actions ADD CONSTRAINT corporate_actions_ratio_needed
  CHECK (action_type IN ('DIVIDEND', 'CASH_ENTITLEMENT') OR (ratio_from > 0 AND ratio_to > 0));

ALTER TABLE unclaimed_folios
  ADD COLUMN event_date date,
  ADD COLUMN investment_type text;

ALTER TABLE ingestion_jobs ADD COLUMN source_url text;
