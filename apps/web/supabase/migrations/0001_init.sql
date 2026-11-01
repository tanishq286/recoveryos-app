-- =============================================================================
-- RecoveryOS — initial schema
-- Target: Supabase (Postgres 15+), free tier. Also runs on plain Postgres 16
-- given an `auth` schema with `auth.users` and `auth.uid()` (see README).
--
-- Conventions
--   * Every mutable record carries created_at, updated_at, actor_id, version.
--   * Every case-scoped record also carries case_id. `cases` exposes case_id as
--     a generated copy of its own id so one RLS helper covers every table.
--     users, organizations and rule_versions are not case-scoped and have no
--     case_id. audit_events is append-only (no updated_at / version).
--   * version increments on every UPDATE. A writer may send the version it
--     read; a mismatch raises serialization_failure (optimistic locking).
--   * actor_id is taken from the signed-in user, or from the transaction-local
--     setting app.actor_id for trusted server writes. A write with no actor
--     fails.
--   * Money is integer paise (bigint). Rates are basis points (1000 = 10%).
--   * Row-level security is enabled on every table with NO write policies:
--     deny by default. Clients get narrow read policies plus one audited RPC.
-- =============================================================================

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions; -- digest() for the audit hash chain

-- Private helpers live outside the API-exposed `public` schema.
create schema if not exists app;
revoke all on schema app from public;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.case_status as enum (
  'lead', 'consented', 'scoped', 'awaiting_documents', 'evidence_review',
  'client_approval', 'ready_to_file', 'submitted', 'third_party_verification',
  'query_deficiency', 'credited', 'closed'
);
create type public.asset_type as enum (
  'iepf_shares_dividends', 'mutual_funds', 'provident_fund', 'bank_deposits'
);
create type public.holder_type as enum ('self', 'joint', 'nominee', 'heir');
create type public.route_kind as enum (
  'iepf', 'company_rta', 'institution', 'manual_review', 'insufficient_evidence'
);
create type public.user_role as enum ('client', 'case_lead', 'reviewer', 'admin', 'system');
create type public.party_role as enum (
  'client', 'case_lead', 'reviewer', 'company', 'rta', 'authority', 'broker', 'system'
);
create type public.evidence_category as enum (
  'share_certificate', 'identity_proof', 'address_proof', 'bank_proof', 'demat_proof',
  'company_correspondence', 'name_change_proof', 'succession_document', 'iepf_filing',
  'authority_correspondence'
);
create type public.extraction_status as enum (
  'queued', 'extracting', 'extracted', 'needs_review', 'failed', 'not_applicable'
);
create type public.confidence_level as enum ('high', 'medium', 'low', 'not_found');
create type public.review_status as enum ('pending', 'approved', 'corrected');
create type public.task_status as enum ('open', 'waiting', 'blocked', 'done');
create type public.submission_kind as enum ('iepf5', 'rta_request', 'query_response');
create type public.submission_status as enum (
  'draft', 'filed', 'acknowledged', 'query_raised', 'approved', 'rejected'
);
create type public.external_source as enum (
  'company', 'rta', 'iepf_authority', 'mca', 'depository', 'bank', 'broker', 'other'
);
create type public.message_channel as enum ('in_app', 'email', 'sms', 'whatsapp', 'post', 'phone');
create type public.message_direction as enum ('inbound', 'outbound', 'internal');
create type public.quote_status as enum ('not_shared', 'shared', 'accepted', 'withdrawn');
create type public.invoice_status as enum ('draft', 'issued', 'paid', 'void');
create type public.rule_status as enum ('draft', 'published', 'retired');

-- -----------------------------------------------------------------------------
-- Identity
-- -----------------------------------------------------------------------------

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  kind        text not null default 'recoveryos' check (kind in ('recoveryos', 'partner')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  actor_id    uuid not null,
  version     integer not null default 1 check (version > 0)
);

create table public.users (
  id               uuid primary key default gen_random_uuid(),
  -- Link to Supabase Auth. Null for the system actor and invited-but-not-signed-up users.
  auth_user_id     uuid unique references auth.users (id) on delete set null,
  organization_id  uuid references public.organizations (id),
  role             public.user_role not null default 'client',
  full_name        text not null check (length(btrim(full_name)) > 0),
  email            text,
  phone_last4      text check (phone_last4 ~ '^[0-9]{4}$'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  actor_id         uuid not null,
  version          integer not null default 1 check (version > 0),
  constraint staff_belong_to_an_org check (role in ('client', 'system') or organization_id is not null)
);

-- The system actor exists before anyone signs in, so the first writes have an author.
insert into public.users (id, role, full_name, actor_id)
values ('00000000-0000-4000-8000-000000000000', 'system', 'RecoveryOS system',
        '00000000-0000-4000-8000-000000000000');

alter table public.organizations
  add constraint organizations_actor_fk foreign key (actor_id) references public.users (id);
alter table public.users
  add constraint users_actor_fk foreign key (actor_id) references public.users (id);

-- -----------------------------------------------------------------------------
-- Rules (versioned, immutable once published)
-- -----------------------------------------------------------------------------

create table public.rule_versions (
  id              uuid primary key default gen_random_uuid(),
  rule_set        text not null,                     -- e.g. 'iepf-triage'
  rule_version    text not null,                     -- e.g. '2026.09-r1'
  status          public.rule_status not null default 'draft',
  effective_from  date not null,
  effective_to    date,
  definition      jsonb not null,
  checksum        text generated always as
                    (encode(extensions.digest(definition::text, 'sha256'), 'hex')) stored,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  actor_id        uuid not null references public.users (id),
  version         integer not null default 1 check (version > 0),
  unique (rule_set, rule_version),
  check (effective_to is null or effective_to >= effective_from),
  check (status = 'draft' or published_at is not null)
);

-- -----------------------------------------------------------------------------
-- Cases and everything scoped to them
-- -----------------------------------------------------------------------------

create table public.cases (
  id                      uuid primary key default gen_random_uuid(),
  case_id                 uuid generated always as (id) stored unique,
  reference               text not null unique check (reference ~ '^RC-[0-9]{4}-[0-9]{4,}$'),
  organization_id         uuid not null references public.organizations (id),
  client_user_id          uuid not null references public.users (id),
  case_lead_id            uuid references public.users (id),
  title                   text not null,
  status                  public.case_status not null default 'lead',
  status_changed_at       timestamptz not null default now(),
  route                   public.route_kind not null default 'insufficient_evidence',
  route_note              text,
  -- "We are waiting for …" — always a named owner and a date.
  next_waiting_for        text,
  next_owner_name         text,
  next_owner_role         public.party_role,
  next_owner_user_id      uuid references public.users (id),
  next_date               date,
  next_date_meaning       text check (next_date_meaning in ('due', 'expected', 'follow_up')),
  blocker_title           text,
  blocker_detail          text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  actor_id                uuid not null references public.users (id),
  version                 integer not null default 1 check (version > 0),
  constraint next_step_is_complete check (
    next_waiting_for is null
    or (next_owner_name is not null and next_owner_role is not null and next_date is not null)
  ),
  constraint blocker_has_detail check ((blocker_title is null) = (blocker_detail is null))
);

create table public.claimants (
  id                      uuid primary key default gen_random_uuid(),
  case_id                 uuid not null references public.cases (id) on delete restrict,
  user_id                 uuid references public.users (id),
  full_name               text not null,
  holder_type             public.holder_type not null,
  relationship_to_holder  text,
  original_holder_name    text,
  city                    text,
  -- Full PAN / Aadhaar never live in plain columns; they stay inside the evidence file.
  pan_last4               text check (pan_last4 ~ '^[0-9]{3}[A-Z]$'),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  actor_id                uuid not null references public.users (id),
  version                 integer not null default 1 check (version > 0),
  check (holder_type not in ('nominee', 'heir') or original_holder_name is not null)
);

create table public.assets (
  id                      uuid primary key default gen_random_uuid(),
  case_id                 uuid not null references public.cases (id) on delete restrict,
  asset_type              public.asset_type not null,
  issuer_name             text not null,
  issuer_cin              text check (issuer_cin ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$'),
  rta_name                text,
  folio_number            text,
  share_quantity          integer check (share_quantity >= 0),
  -- Null means "not yet confirmed by a document". Never an estimate.
  dividend_amount_paise   bigint check (dividend_amount_paise >= 0),
  transferred_to_iepf_on  date,
  financial_years         text[] not null default '{}',
  source_note             text not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  actor_id                uuid not null references public.users (id),
  version                 integer not null default 1 check (version > 0)
);

create table public.evidence_files (
  id                  uuid primary key default gen_random_uuid(),
  case_id             uuid not null references public.cases (id) on delete restrict,
  file_name           text not null,
  category            public.evidence_category not null,
  mime_type           text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic')),
  byte_size           bigint not null check (byte_size > 0 and byte_size <= 26214400),
  page_count          integer not null default 1 check (page_count > 0),
  storage_path        text not null unique,             -- Supabase Storage object key (private bucket)
  sha256              text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by         uuid not null references public.users (id),
  uploaded_at         timestamptz not null default now(),
  extraction_status   public.extraction_status not null default 'queued',
  extraction_note     text,
  retention_until     date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  actor_id            uuid not null references public.users (id),
  version             integer not null default 1 check (version > 0),
  unique (case_id, sha256),                              -- the same file twice is the same evidence
  check (extraction_status <> 'failed' or extraction_note is not null)
);

create table public.extracted_fields (
  id                  uuid primary key default gen_random_uuid(),
  case_id             uuid not null references public.cases (id) on delete restrict,
  evidence_file_id    uuid not null references public.evidence_files (id) on delete restrict,
  field_key           text not null check (field_key ~ '^[a-z][a-z0-9_]*$'),
  label               text not null,
  value_text          text,
  source_page         integer check (source_page > 0),
  source_snippet      text,
  bbox                jsonb,
  confidence          public.confidence_level not null,
  confidence_reason   text not null,
  cross_check_outcome text check (cross_check_outcome in ('match', 'mismatch', 'not_checked')),
  cross_check_note    text,
  extractor           text not null,                   -- model / ruleset that produced it
  needs_client_check  boolean not null default false,
  review_status       public.review_status not null default 'pending',
  corrected_value     text,
  correction_reason   text,
  reviewed_at         timestamptz,
  reviewed_by         uuid references public.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  actor_id            uuid not null references public.users (id),
  version             integer not null default 1 check (version > 0),
  unique (evidence_file_id, field_key),
  -- The core honesty rules, enforced by the database, not just the UI:
  constraint not_found_means_no_value check ((confidence = 'not_found') = (value_text is null)),
  constraint value_has_provenance check (
    value_text is null or (source_page is not null and source_snippet is not null)
  ),
  constraint correction_is_explained check (
    review_status <> 'corrected'
    or (corrected_value is not null and correction_reason is not null)
  ),
  constraint review_is_attributed check (
    review_status = 'pending' or (reviewed_at is not null and reviewed_by is not null)
  ),
  constraint cannot_approve_a_gap check (value_text is not null or review_status = 'pending')
);

create table public.consents (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases (id) on delete restrict,
  subject_user_id uuid not null references public.users (id),
  purpose         text not null,
  notice_version  text not null,
  channel         text not null default 'in_app' check (channel in ('in_app', 'paper', 'assisted_call')),
  granted_at      timestamptz not null default now(),
  withdrawn_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  actor_id        uuid not null references public.users (id),
  version         integer not null default 1 check (version > 0),
  check (withdrawn_at is null or withdrawn_at >= granted_at)
);

create table public.eligibility_assessments (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases (id) on delete restrict,
  rule_version_id  uuid not null references public.rule_versions (id),
  inputs           jsonb not null,
  route            public.route_kind not null,
  confidence       text not null check (confidence in ('likely', 'possible', 'undetermined')),
  headline         text not null,
  reasons          jsonb not null default '[]',
  missing          jsonb not null default '[]',
  -- The "sources checked" receipt: one entry per source, with status and checked_at (or null).
  sources          jsonb not null default '[]',
  assessed_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  actor_id         uuid not null references public.users (id),
  version          integer not null default 1 check (version > 0),
  check (jsonb_typeof(sources) = 'array' and jsonb_typeof(missing) = 'array')
);

create table public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  case_id             uuid not null references public.cases (id) on delete restrict,
  title               text not null,
  detail              text not null default '',
  owner_name          text not null,
  owner_role          public.party_role not null,
  owner_organization  text,
  owner_user_id       uuid references public.users (id),
  due_on              date,
  due_meaning         text not null default 'due' check (due_meaning in ('due', 'expected')),
  status              public.task_status not null default 'open',
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  actor_id            uuid not null references public.users (id),
  version             integer not null default 1 check (version > 0),
  check ((status = 'done') = (completed_at is not null))
);

create table public.submissions (
  id                       uuid primary key default gen_random_uuid(),
  case_id                  uuid not null references public.cases (id) on delete restrict,
  kind                     public.submission_kind not null,
  reference                text,                        -- e.g. MCA service request number
  submitted_on             date,
  status                   public.submission_status not null default 'draft',
  acknowledgement_file_id  uuid references public.evidence_files (id),
  note                     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  actor_id                 uuid not null references public.users (id),
  version                  integer not null default 1 check (version > 0),
  check (status = 'draft' or submitted_on is not null)
);

create table public.external_events (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references public.cases (id) on delete restrict,
  source            public.external_source not null,
  source_name       text not null,                     -- e.g. the company or registrar's name
  event_type        text not null,                     -- e.g. 'entitlement_letter', 'query_raised'
  occurred_at       timestamptz not null,
  summary           text not null,
  raw               jsonb,
  evidence_file_id  uuid references public.evidence_files (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  actor_id          uuid not null references public.users (id),
  version           integer not null default 1 check (version > 0)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases (id) on delete restrict,
  sender_user_id  uuid references public.users (id),
  channel         public.message_channel not null default 'in_app',
  direction       public.message_direction not null,
  subject         text,
  body            text not null,
  sent_at         timestamptz not null default now(),
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  actor_id        uuid not null references public.users (id),
  version         integer not null default 1 check (version > 0)
);

create table public.quotes (
  id                         uuid primary key default gen_random_uuid(),
  case_id                    uuid not null references public.cases (id) on delete restrict,
  status                     public.quote_status not null default 'not_shared',
  success_fee_bps            integer not null default 1000 check (success_fee_bps between 0 and 10000),
  -- Planned, conditional benefit: only applies if the client opts in AND a policy is issued.
  protection_allocation_bps  integer not null default 1000 check (protection_allocation_bps between 0 and 10000),
  protection_opt_in          boolean,                   -- null = not chosen yet
  indicative_value_paise     bigint check (indicative_value_paise >= 0),
  indicative_value_basis     text,
  excluded_from_estimate     jsonb not null default '[]',
  valuation_rule             text not null,
  conditions                 jsonb not null default '[]',
  shared_at                  timestamptz,
  accepted_at                timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  actor_id                   uuid not null references public.users (id),
  version                    integer not null default 1 check (version > 0),
  constraint value_needs_basis check ((indicative_value_paise is null) = (indicative_value_basis is null)),
  constraint accepted_after_shared check (
    accepted_at is null or (shared_at is not null and accepted_at >= shared_at)
  ),
  constraint fees_within_recovery check (success_fee_bps + protection_allocation_bps <= 10000)
);

create table public.invoices (
  id                         uuid primary key default gen_random_uuid(),
  case_id                    uuid not null references public.cases (id) on delete restrict,
  quote_id                   uuid not null references public.quotes (id),
  number                     text unique,
  credited_value_paise       bigint not null check (credited_value_paise >= 0),
  -- Evidence of the credit (demat statement / bank statement) the fee is computed from.
  valuation_evidence_file_id uuid references public.evidence_files (id),
  fee_paise                  bigint not null check (fee_paise >= 0),
  gst_paise                  bigint not null default 0 check (gst_paise >= 0),
  protection_paise           bigint not null default 0 check (protection_paise >= 0),
  status                     public.invoice_status not null default 'draft',
  issued_on                  date,
  due_on                     date,
  paid_on                    date,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  actor_id                   uuid not null references public.users (id),
  version                    integer not null default 1 check (version > 0),
  check (status = 'draft' or (number is not null and issued_on is not null and valuation_evidence_file_id is not null)),
  check (status <> 'paid' or paid_on is not null),
  check (fee_paise <= credited_value_paise)
);

-- -----------------------------------------------------------------------------
-- Audit log: append-only, hash-chained
-- -----------------------------------------------------------------------------

create table public.audit_events (
  seq           bigint generated always as identity primary key,
  id            uuid not null default gen_random_uuid() unique,
  case_id       uuid references public.cases (id) on delete restrict,
  actor_id      uuid not null references public.users (id),
  action        text not null check (action in ('insert', 'update', 'delete')),
  entity_table  text not null,
  entity_id     uuid not null,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now(),
  prev_hash     text,
  hash          text not null check (hash ~ '^[0-9a-f]{64}$')
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index on public.cases (client_user_id);
create index on public.cases (case_lead_id);
create index on public.cases (organization_id, status);
create index on public.claimants (case_id);
create index on public.assets (case_id);
create index on public.evidence_files (case_id, uploaded_at desc);
create index on public.extracted_fields (case_id, review_status);
create index on public.extracted_fields (evidence_file_id);
create index on public.consents (case_id);
create index on public.eligibility_assessments (case_id, assessed_at desc);
create index on public.tasks (case_id, status, due_on);
create index on public.submissions (case_id);
create index on public.external_events (case_id, occurred_at desc);
create index on public.messages (case_id, sent_at desc);
create index on public.quotes (case_id);
create index on public.invoices (case_id);
create index on public.audit_events (case_id, seq);
create index on public.audit_events (entity_table, entity_id, seq);
create index on public.users (organization_id);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- The users.id of whoever is acting: the signed-in user, else a trusted server
-- process that ran `set local app.actor_id = '<uuid>'` in this transaction.
create function app.current_actor_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select u.id from public.users u where u.auth_user_id = auth.uid()),
    nullif(current_setting('app.actor_id', true), '')::uuid
  );
$$;

create function app.current_user_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.id from public.users u where u.auth_user_id = auth.uid();
$$;

-- Can the signed-in user see this case? Client, case lead, or reviewer/admin of the same org.
create function app.can_read_case(p_case_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.cases c
    join public.users u on u.auth_user_id = auth.uid()
    where c.id = p_case_id
      and (
        c.client_user_id = u.id
        or c.case_lead_id = u.id
        or (u.role in ('reviewer', 'admin') and u.organization_id = c.organization_id)
      )
  );
$$;

create function app.is_case_client(p_case_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.cases c
    join public.users u on u.auth_user_id = auth.uid()
    where c.id = p_case_id and c.client_user_id = u.id
  );
$$;

-- BEFORE INSERT/UPDATE on every mutable table: timestamps, version, actor.
create function app.touch_row() returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_actor uuid := app.current_actor_id();
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    new.actor_id := coalesce(v_actor, new.actor_id);
    if new.actor_id is null then
      raise exception 'actor required: sign in, or set app.actor_id for server writes'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.id is distinct from old.id then
    raise exception 'id is immutable' using errcode = '42501';
  end if;
  if new.version <> old.version then
    raise exception 'version conflict on %.%: expected %, found %',
      tg_table_schema, tg_table_name, new.version, old.version
      using errcode = '40001';
  end if;
  if v_actor is null then
    raise exception 'actor required: sign in, or set app.actor_id for server writes'
      using errcode = '42501';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.version := old.version + 1;
  new.actor_id := v_actor;
  return new;
end;
$$;

-- AFTER INSERT/UPDATE/DELETE: append a hash-chained audit event.
create function app.audit_row() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after  jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row    jsonb := coalesce(v_after, v_before);
  v_actor  uuid  := coalesce(app.current_actor_id(), (v_row ->> 'actor_id')::uuid);
  v_prev   text;
  v_at     timestamptz := now();
begin
  -- Serialise writers so the chain has exactly one head.
  perform pg_advisory_xact_lock(hashtext('recoveryos.audit_chain'));
  select a.hash into v_prev from public.audit_events a order by a.seq desc limit 1;

  insert into public.audit_events
    (case_id, actor_id, action, entity_table, entity_id, before, after, created_at, prev_hash, hash)
  values (
    (v_row ->> 'case_id')::uuid,
    v_actor,
    lower(tg_op),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    v_before,
    v_after,
    v_at,
    v_prev,
    encode(extensions.digest(
      concat_ws('|', coalesce(v_prev, 'genesis'), tg_table_name, lower(tg_op),
                v_row ->> 'id', v_actor::text, v_at::text,
                coalesce(v_before::text, ''), coalesce(v_after::text, '')),
      'sha256'), 'hex')
  );
  return null;
end;
$$;

create function app.forbid_audit_change() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'audit_events is append-only' using errcode = '42501';
end;
$$;

-- Published rules are frozen: only retiring them (status, effective_to) is allowed.
create function app.freeze_published_rules() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status <> 'draft' and (
       new.definition is distinct from old.definition
    or new.rule_set is distinct from old.rule_set
    or new.rule_version is distinct from old.rule_version
    or new.effective_from is distinct from old.effective_from
    or new.published_at is distinct from old.published_at
  ) then
    raise exception 'published rule versions are immutable; publish a new version instead'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'users', 'rule_versions', 'cases', 'claimants', 'assets',
    'evidence_files', 'extracted_fields', 'consents', 'eligibility_assessments', 'tasks',
    'submissions', 'external_events', 'messages', 'quotes', 'invoices'
  ] loop
    execute format(
      'create trigger touch_row before insert or update on public.%I
         for each row execute function app.touch_row()', t);
    execute format(
      'create trigger audit_row after insert or update or delete on public.%I
         for each row execute function app.audit_row()', t);
  end loop;
end;
$$;

create trigger freeze_published_rules before update on public.rule_versions
  for each row execute function app.freeze_published_rules();

create trigger forbid_audit_change before update or delete on public.audit_events
  for each row execute function app.forbid_audit_change();
create trigger forbid_audit_truncate before truncate on public.audit_events
  for each statement execute function app.forbid_audit_change();

-- -----------------------------------------------------------------------------
-- Row-level security: deny by default
-- -----------------------------------------------------------------------------
-- RLS is ENABLED (not FORCED) so SECURITY DEFINER helpers and triggers, which
-- run as the table owner, can evaluate membership and write the audit log.
-- `anon` has no policies and no grants: it can read nothing.
-- `authenticated` gets SELECT policies scoped to cases it belongs to, and no
-- INSERT/UPDATE/DELETE policies at all. All writes go through trusted server
-- code (service role, with app.actor_id set) or the audited RPC below.

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'users', 'rule_versions', 'cases', 'claimants', 'assets',
    'evidence_files', 'extracted_fields', 'consents', 'eligibility_assessments', 'tasks',
    'submissions', 'external_events', 'messages', 'quotes', 'invoices', 'audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;

  -- Case-scoped tables: members of the case can read.
  foreach t in array array[
    'cases', 'claimants', 'assets', 'evidence_files', 'extracted_fields', 'consents',
    'eligibility_assessments', 'tasks', 'submissions', 'external_events', 'messages',
    'quotes', 'invoices', 'audit_events'
  ] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (app.can_read_case(case_id))',
      t || '_read_if_case_member', t);
  end loop;
end;
$$;

grant select on public.users, public.organizations, public.rule_versions to authenticated;

create policy users_read_self on public.users
  for select to authenticated
  using (auth_user_id = auth.uid());

create policy organizations_read_own on public.organizations
  for select to authenticated
  using (id = (select u.organization_id from public.users u where u.auth_user_id = auth.uid()));

create policy rule_versions_read_published on public.rule_versions
  for select to authenticated
  using (status = 'published');

-- Helpers used inside policies must be callable by the querying role.
grant usage on schema app to authenticated;
revoke all on all functions in schema app from public;
grant execute on function app.can_read_case(uuid) to authenticated;
grant execute on function app.current_actor_id() to authenticated;
grant execute on function app.current_user_id() to authenticated;
grant execute on function app.is_case_client(uuid) to authenticated;

-- Trusted server writes (service role) fire the same triggers, which resolve the actor.
grant usage on schema app to service_role;
grant execute on function app.current_actor_id() to service_role;
grant execute on function app.current_user_id() to service_role;
grant execute on function app.can_read_case(uuid) to service_role;
grant execute on function app.is_case_client(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- The one client write: approve or correct an extracted field
-- -----------------------------------------------------------------------------

create function public.review_extracted_field(
  p_field_id          uuid,
  p_decision          text,
  p_corrected_value   text default null,
  p_reason            text default null,
  p_expected_version  integer default null
) returns public.extracted_fields
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_row  public.extracted_fields;
begin
  if v_user is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  select * into v_row from public.extracted_fields where id = p_field_id for update;
  if not found or not app.is_case_client(v_row.case_id) then
    raise exception 'field not found' using errcode = 'P0002';   -- same answer either way
  end if;
  if v_row.review_status <> 'pending' or not v_row.needs_client_check or v_row.value_text is null then
    raise exception 'this detail is not waiting for your review' using errcode = '22023';
  end if;
  if p_expected_version is not null and p_expected_version <> v_row.version then
    raise exception 'this detail changed since you opened it' using errcode = '40001';
  end if;

  if p_decision = 'approve' then
    update public.extracted_fields
       set review_status = 'approved', reviewed_at = now(), reviewed_by = v_user
     where id = p_field_id
     returning * into v_row;
  elsif p_decision = 'correct' then
    if coalesce(btrim(p_corrected_value), '') = '' or coalesce(btrim(p_reason), '') = '' then
      raise exception 'a corrected value and a reason are both required' using errcode = '22023';
    end if;
    if length(p_corrected_value) > 200 or length(p_reason) > 500 then
      raise exception 'corrected value or reason is too long' using errcode = '22023';
    end if;
    update public.extracted_fields
       set review_status = 'corrected',
           corrected_value = btrim(p_corrected_value),
           correction_reason = btrim(p_reason),
           reviewed_at = now(),
           reviewed_by = v_user
     where id = p_field_id
     returning * into v_row;
  else
    raise exception 'decision must be approve or correct' using errcode = '22023';
  end if;

  return v_row;
end;
$$;

revoke all on function public.review_extracted_field(uuid, text, text, text, integer) from public, anon;
grant execute on function public.review_extracted_field(uuid, text, text, text, integer) to authenticated;

commit;
