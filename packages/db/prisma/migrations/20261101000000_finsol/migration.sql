-- Finsol Enterprises: state-partitioned folio store, analyst-released folios,
-- custom per-case fees and valuation reports.

-- ── 1. unclaimed_folios, partitioned by state ────────────────────────────
-- Every search names a state, so Postgres prunes to that state's partition
-- (plus UNKNOWN, for statements that give none) before touching an index.
-- 36 states and union territories + OUT_OF_INDIA = 37 partitions, and one
-- more for UNKNOWN.
CREATE TABLE unclaimed_folios_new (LIKE unclaimed_folios INCLUDING DEFAULTS INCLUDING CONSTRAINTS)
  PARTITION BY LIST (state);

CREATE TABLE unclaimed_folios_andhra_pradesh PARTITION OF unclaimed_folios_new FOR VALUES IN ('ANDHRA_PRADESH');
CREATE TABLE unclaimed_folios_arunachal_pradesh PARTITION OF unclaimed_folios_new FOR VALUES IN ('ARUNACHAL_PRADESH');
CREATE TABLE unclaimed_folios_assam PARTITION OF unclaimed_folios_new FOR VALUES IN ('ASSAM');
CREATE TABLE unclaimed_folios_bihar PARTITION OF unclaimed_folios_new FOR VALUES IN ('BIHAR');
CREATE TABLE unclaimed_folios_chhattisgarh PARTITION OF unclaimed_folios_new FOR VALUES IN ('CHHATTISGARH');
CREATE TABLE unclaimed_folios_goa PARTITION OF unclaimed_folios_new FOR VALUES IN ('GOA');
CREATE TABLE unclaimed_folios_gujarat PARTITION OF unclaimed_folios_new FOR VALUES IN ('GUJARAT');
CREATE TABLE unclaimed_folios_haryana PARTITION OF unclaimed_folios_new FOR VALUES IN ('HARYANA');
CREATE TABLE unclaimed_folios_himachal_pradesh PARTITION OF unclaimed_folios_new FOR VALUES IN ('HIMACHAL_PRADESH');
CREATE TABLE unclaimed_folios_jharkhand PARTITION OF unclaimed_folios_new FOR VALUES IN ('JHARKHAND');
CREATE TABLE unclaimed_folios_karnataka PARTITION OF unclaimed_folios_new FOR VALUES IN ('KARNATAKA');
CREATE TABLE unclaimed_folios_kerala PARTITION OF unclaimed_folios_new FOR VALUES IN ('KERALA');
CREATE TABLE unclaimed_folios_madhya_pradesh PARTITION OF unclaimed_folios_new FOR VALUES IN ('MADHYA_PRADESH');
CREATE TABLE unclaimed_folios_maharashtra PARTITION OF unclaimed_folios_new FOR VALUES IN ('MAHARASHTRA');
CREATE TABLE unclaimed_folios_manipur PARTITION OF unclaimed_folios_new FOR VALUES IN ('MANIPUR');
CREATE TABLE unclaimed_folios_meghalaya PARTITION OF unclaimed_folios_new FOR VALUES IN ('MEGHALAYA');
CREATE TABLE unclaimed_folios_mizoram PARTITION OF unclaimed_folios_new FOR VALUES IN ('MIZORAM');
CREATE TABLE unclaimed_folios_nagaland PARTITION OF unclaimed_folios_new FOR VALUES IN ('NAGALAND');
CREATE TABLE unclaimed_folios_odisha PARTITION OF unclaimed_folios_new FOR VALUES IN ('ODISHA');
CREATE TABLE unclaimed_folios_punjab PARTITION OF unclaimed_folios_new FOR VALUES IN ('PUNJAB');
CREATE TABLE unclaimed_folios_rajasthan PARTITION OF unclaimed_folios_new FOR VALUES IN ('RAJASTHAN');
CREATE TABLE unclaimed_folios_sikkim PARTITION OF unclaimed_folios_new FOR VALUES IN ('SIKKIM');
CREATE TABLE unclaimed_folios_tamil_nadu PARTITION OF unclaimed_folios_new FOR VALUES IN ('TAMIL_NADU');
CREATE TABLE unclaimed_folios_telangana PARTITION OF unclaimed_folios_new FOR VALUES IN ('TELANGANA');
CREATE TABLE unclaimed_folios_tripura PARTITION OF unclaimed_folios_new FOR VALUES IN ('TRIPURA');
CREATE TABLE unclaimed_folios_uttar_pradesh PARTITION OF unclaimed_folios_new FOR VALUES IN ('UTTAR_PRADESH');
CREATE TABLE unclaimed_folios_uttarakhand PARTITION OF unclaimed_folios_new FOR VALUES IN ('UTTARAKHAND');
CREATE TABLE unclaimed_folios_west_bengal PARTITION OF unclaimed_folios_new FOR VALUES IN ('WEST_BENGAL');
CREATE TABLE unclaimed_folios_andaman_and_nicobar_islands PARTITION OF unclaimed_folios_new FOR VALUES IN ('ANDAMAN_AND_NICOBAR_ISLANDS');
CREATE TABLE unclaimed_folios_chandigarh PARTITION OF unclaimed_folios_new FOR VALUES IN ('CHANDIGARH');
CREATE TABLE unclaimed_folios_dadra_and_nagar_haveli_and_daman_and_diu PARTITION OF unclaimed_folios_new FOR VALUES IN ('DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU');
CREATE TABLE unclaimed_folios_delhi PARTITION OF unclaimed_folios_new FOR VALUES IN ('DELHI');
CREATE TABLE unclaimed_folios_jammu_and_kashmir PARTITION OF unclaimed_folios_new FOR VALUES IN ('JAMMU_AND_KASHMIR');
CREATE TABLE unclaimed_folios_ladakh PARTITION OF unclaimed_folios_new FOR VALUES IN ('LADAKH');
CREATE TABLE unclaimed_folios_lakshadweep PARTITION OF unclaimed_folios_new FOR VALUES IN ('LAKSHADWEEP');
CREATE TABLE unclaimed_folios_puducherry PARTITION OF unclaimed_folios_new FOR VALUES IN ('PUDUCHERRY');
CREATE TABLE unclaimed_folios_out_of_india PARTITION OF unclaimed_folios_new FOR VALUES IN ('OUT_OF_INDIA');
CREATE TABLE unclaimed_folios_unknown PARTITION OF unclaimed_folios_new FOR VALUES IN ('UNKNOWN');

INSERT INTO unclaimed_folios_new SELECT * FROM unclaimed_folios;

-- A primary key on a partitioned table must include the partition key, so
-- no other table can hold a foreign key to (id) alone. recovery_cases.folio_id
-- is checked by the application instead.
ALTER TABLE recovery_cases DROP CONSTRAINT recovery_cases_folio_id_fkey;
DROP TABLE unclaimed_folios;
ALTER TABLE unclaimed_folios_new RENAME TO unclaimed_folios;

ALTER TABLE unclaimed_folios ADD CONSTRAINT unclaimed_folios_pkey PRIMARY KEY (id, state);
CREATE UNIQUE INDEX unclaimed_folios_company_folio_holder_state_key
  ON unclaimed_folios (company_id, folio_number_hash, investor_full_name, state);
-- The bulk merge matches holders across states by (company, folio, name).
CREATE INDEX unclaimed_folios_company_folio_idx ON unclaimed_folios (company_id, folio_number_hash);
CREATE INDEX unclaimed_folios_company_id_idx ON unclaimed_folios (company_id);
CREATE INDEX unclaimed_folios_ingestion_job_id_idx ON unclaimed_folios (ingestion_job_id);

-- Inside a partition the state is constant, so name indexes no longer lead with it.
CREATE INDEX unclaimed_folios_last_name_key_idx   ON unclaimed_folios (last_name_key);
CREATE INDEX unclaimed_folios_first_name_key_idx  ON unclaimed_folios (first_name_key);
CREATE INDEX unclaimed_folios_middle_name_key_idx ON unclaimed_folios (middle_name_key);
CREATE INDEX unclaimed_folios_full_name_trgm   ON unclaimed_folios USING gin (full_name_norm gin_trgm_ops);
CREATE INDEX unclaimed_folios_first_name_trgm  ON unclaimed_folios USING gin (first_name_norm gin_trgm_ops);
CREATE INDEX unclaimed_folios_middle_name_trgm ON unclaimed_folios USING gin (middle_name_norm gin_trgm_ops);
CREATE INDEX unclaimed_folios_last_name_trgm   ON unclaimed_folios USING gin (last_name_norm gin_trgm_ops);
CREATE INDEX unclaimed_folios_last_soundex    ON unclaimed_folios (soundex(last_name_norm));
CREATE INDEX unclaimed_folios_first_soundex   ON unclaimed_folios (soundex(first_name_norm));
CREATE INDEX unclaimed_folios_middle_soundex  ON unclaimed_folios (soundex(middle_name_norm));
CREATE INDEX unclaimed_folios_last_dmetaphone ON unclaimed_folios (dmetaphone(last_name_norm));

ALTER TABLE unclaimed_folios
  ADD CONSTRAINT unclaimed_folios_company_id_fkey FOREIGN KEY (company_id)
    REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT unclaimed_folios_ingestion_job_id_fkey FOREIGN KEY (ingestion_job_id)
    REFERENCES ingestion_jobs(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 2. Folio numbers released to a client by their analyst ───────────────
ALTER TABLE leads_and_inquiries ADD COLUMN released_folio_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE recovery_cases ADD COLUMN folio_released_at timestamptz(6);

-- ── 3. Custom pricing: staff set each case's fee; no default ─────────────
ALTER TABLE recovery_cases ALTER COLUMN agreed_success_fee_pct DROP DEFAULT;
ALTER TABLE recovery_cases ALTER COLUMN agreed_success_fee_pct DROP NOT NULL;
-- A mandate can only be signed once a fee has been set.
ALTER TABLE recovery_cases ADD CONSTRAINT recovery_cases_fee_before_esign
  CHECK (esign_status = 'PENDING' OR agreed_success_fee_pct IS NOT NULL);

-- ── 4. Valuation reports (Report ID FE-VAL-…) ────────────────────────────
CREATE TABLE valuation_reports (
  id uuid PRIMARY KEY,
  report_code text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  phone text NOT NULL,
  holdings jsonb NOT NULL,
  total_value_paise bigint NOT NULL CHECK (total_value_paise >= 0),
  created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX valuation_reports_phone_created_at_idx ON valuation_reports (phone, created_at DESC);
