-- Source provenance, row-level validation and quote timestamps.
-- Additive only: new tables, new nullable or defaulted columns, no rewrites of
-- existing rows (constant defaults are metadata-only in PostgreSQL 11+), no
-- drops. Existing holder rows keep every value they had.

-- ── 1. Source documents: one row per file version (by checksum) ─────────
CREATE TABLE "source_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "source_url" TEXT,
    "file_name" TEXT NOT NULL,
    -- IEPF_2_STATEMENT | IEPF_4_STATEMENT | AUTHORISED_UPLOAD | LICENSED_FEED
    "document_type" TEXT NOT NULL,
    -- e.g. "FY 2013-14 dividend, transfer due 2021" when the document states it.
    "reporting_period" TEXT,
    "published_at" TIMESTAMPTZ(6),
    -- How published_at is known: HTTP_LAST_MODIFIED | STATED_IN_DOCUMENT | UNKNOWN
    "published_at_basis" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "retrieved_at" TIMESTAMPTZ(6) NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "content_type" TEXT,
    "parser_version" TEXT NOT NULL,
    -- RETRIEVED | PARSED | PARSE_FAILED | IMPORTED | IMPORT_FAILED
    "status" TEXT NOT NULL DEFAULT 'RETRIEVED',
    "status_detail" TEXT,
    -- PENDING_REVIEW | APPROVED | REJECTED
    "review_status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    -- UNPUBLISHED | PUBLISHED | WITHDRAWN
    "publication_status" TEXT NOT NULL DEFAULT 'UNPUBLISHED',
    -- What the quantities mean: e.g. SHARES_AS_STATED_ON_EVENT_DATE, AMOUNT_ONLY
    "quantity_basis" TEXT,
    "quantity_effective_date" DATE,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "warning_rows" INTEGER NOT NULL DEFAULT 0,
    "quarantined_rows" INTEGER NOT NULL DEFAULT 0,
    "ingestion_job_id" UUID,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "source_documents_company_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT,
    CONSTRAINT "source_documents_job_fkey" FOREIGN KEY ("ingestion_job_id") REFERENCES "ingestion_jobs"("id") ON DELETE SET NULL,
    CONSTRAINT "source_documents_reviewer_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "source_documents_type_known" CHECK ("document_type" IN ('IEPF_2_STATEMENT','IEPF_4_STATEMENT','AUTHORISED_UPLOAD','LICENSED_FEED')),
    CONSTRAINT "source_documents_status_known" CHECK ("status" IN ('RETRIEVED','PARSED','PARSE_FAILED','IMPORTED','IMPORT_FAILED')),
    CONSTRAINT "source_documents_review_known" CHECK ("review_status" IN ('PENDING_REVIEW','APPROVED','REJECTED')),
    CONSTRAINT "source_documents_publication_known" CHECK ("publication_status" IN ('UNPUBLISHED','PUBLISHED','WITHDRAWN')),
    CONSTRAINT "source_documents_published_basis_known" CHECK ("published_at_basis" IN ('HTTP_LAST_MODIFIED','STATED_IN_DOCUMENT','UNKNOWN'))
);
-- The same file (by checksum) is one document per parser version.
CREATE UNIQUE INDEX "source_documents_sha_parser_key" ON "source_documents" ("sha256", "parser_version");
CREATE INDEX "source_documents_company_idx" ON "source_documents" ("company_id", "retrieved_at" DESC);

-- The checksum, size, URL and retrieval time describe bytes that existed; they never change.
CREATE FUNCTION source_documents_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'source_documents rows are kept for provenance and cannot be deleted';
  END IF;
  IF NEW.sha256 IS DISTINCT FROM OLD.sha256 OR NEW.bytes IS DISTINCT FROM OLD.bytes
     OR NEW.source_url IS DISTINCT FROM OLD.source_url OR NEW.retrieved_at IS DISTINCT FROM OLD.retrieved_at
     OR NEW.parser_version IS DISTINCT FROM OLD.parser_version THEN
    RAISE EXCEPTION 'source_documents identity columns are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER source_documents_immutable BEFORE UPDATE OR DELETE ON source_documents
  FOR EACH ROW EXECUTE FUNCTION source_documents_immutable();

-- ── 2. Source rows: the raw cells exactly as extracted, plus validation ──
CREATE TABLE "source_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_document_id" UUID NOT NULL,
    "row_index" INTEGER NOT NULL,
    -- Where in the file: "page 12, y -340" or "sheet Sheet1, row 31".
    "row_ref" TEXT NOT NULL,
    -- AES-256-GCM ciphertext of the raw cells as JSON {header: value}. The
    -- folio number is in here, so the plaintext is never stored.
    "raw_cells_enc" TEXT NOT NULL,
    -- HMAC of the raw JSON, so reprocessing can detect identical rows.
    "raw_hash" TEXT NOT NULL,
    "extraction_notes" TEXT[] NOT NULL DEFAULT '{}',
    -- VALID | WARNING | QUARANTINED
    "validation_status" TEXT NOT NULL,
    "issues" TEXT[] NOT NULL DEFAULT '{}',
    -- Set once the row is merged into a holder record (no FK: partitioned table).
    "folio_id" UUID,
    "folio_state" "IndianState",
    "review_status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "source_rows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "source_rows_document_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE RESTRICT,
    CONSTRAINT "source_rows_reviewer_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "source_rows_status_known" CHECK ("validation_status" IN ('VALID','WARNING','QUARANTINED')),
    CONSTRAINT "source_rows_review_known" CHECK ("review_status" IN ('PENDING_REVIEW','APPROVED','REJECTED','NOT_REQUIRED'))
);
CREATE UNIQUE INDEX "source_rows_document_row_key" ON "source_rows" ("source_document_id", "row_index");
CREATE INDEX "source_rows_status_idx" ON "source_rows" ("validation_status", "review_status");
CREATE INDEX "source_rows_folio_idx" ON "source_rows" ("folio_id");

CREATE FUNCTION source_rows_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'source_rows are kept for provenance and cannot be deleted';
  END IF;
  IF NEW.raw_cells_enc IS DISTINCT FROM OLD.raw_cells_enc OR NEW.raw_hash IS DISTINCT FROM OLD.raw_hash
     OR NEW.row_ref IS DISTINCT FROM OLD.row_ref OR NEW.row_index IS DISTINCT FROM OLD.row_index
     OR NEW.source_document_id IS DISTINCT FROM OLD.source_document_id THEN
    RAISE EXCEPTION 'source_rows raw values are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER source_rows_immutable BEFORE UPDATE OR DELETE ON source_rows
  FOR EACH ROW EXECUTE FUNCTION source_rows_immutable();

-- ── 3. Holder records: normalised values keep their raw counterpart ─────
ALTER TABLE unclaimed_folios
  ADD COLUMN "source_document_id" UUID,
  ADD COLUMN "source_row_ids" UUID[] NOT NULL DEFAULT '{}',
  -- The father/spouse text as the source gave it, before placeholders were removed.
  ADD COLUMN "father_or_spouse_raw" TEXT,
  -- UNVERIFIED (imported before validation existed) | VALID | WARNING | QUARANTINED
  ADD COLUMN "validation_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "validation_issues" TEXT[] NOT NULL DEFAULT '{}',
  -- PUBLISHED rows are searchable; QUARANTINED rows wait for staff review.
  ADD COLUMN "review_status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  -- What original_shares means and on which date it was true.
  ADD COLUMN "quantity_basis" TEXT,
  ADD COLUMN "quantity_effective_date" DATE;
ALTER TABLE unclaimed_folios ADD CONSTRAINT "unclaimed_folios_validation_known"
  CHECK ("validation_status" IN ('UNVERIFIED','VALID','WARNING','QUARANTINED'));
ALTER TABLE unclaimed_folios ADD CONSTRAINT "unclaimed_folios_review_known"
  CHECK ("review_status" IN ('PUBLISHED','QUARANTINED','WITHDRAWN'));

-- ── 4. Ingestion jobs: which reader ran, and retries ────────────────────
ALTER TABLE ingestion_jobs
  ADD COLUMN "source_document_id" UUID,
  ADD COLUMN "parser_version" TEXT,
  ADD COLUMN "dry_run" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "retry_of_id" UUID,
  ADD COLUMN "warning_rows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "quarantined_rows" INTEGER NOT NULL DEFAULT 0;

-- ── 5. Prices: the market's quote time is not the time we fetched it ────
ALTER TABLE companies
  -- When the exchange printed this price (the provider's own timestamp).
  ADD COLUMN "price_quote_at" TIMESTAMPTZ(6),
  -- Last attempt to refresh, successful or not, and its error if it failed.
  ADD COLUMN "price_attempted_at" TIMESTAMPTZ(6),
  ADD COLUMN "price_error" TEXT;
