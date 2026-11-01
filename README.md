# Finsol Enterprises

Turnkey recovery of unclaimed shares and dividends in India. Visitors start a **3-Minute
Check** with only a name and a state; signed-in members see what is held and its value;
Finsol's case team does everything else. **No Upfront Fee • No Recovery, No Fee • 100%
Confidential.**

The platform (internal package scope `@recoveryos/*`) has:

- a public 3-Minute Check over companies' IEPF-2/IEPF-4 filings, in a state-partitioned
  PostgreSQL table, with a live refresh of company-published statements behind every search;
- a Login Gateway (full name, mobile OTP, email) in front of company names, share counts, values
  and valuation PDFs; folio numbers stay masked for clients until their analyst releases them;
- a multi-stock Family Wealth Calculator with live NSE/BSE prices, verified bonus and split
  histories, dividends since purchase and an OTP-gated Share Valuation PDF (Report ID
  `FE-VAL-…`, total in words, two per mobile per day);
- a client portal showing Finsol's 4-step service, a Digital Mandate with a fee the case team
  sets per case (custom pricing), Aadhaar eSign and a document vault;
- a staff workspace: CRM board, internal company files (nodal officers, registrars, CIN/ISIN),
  folio release, fee setting and a bulk importer.

**What the public never sees.** No links to government or registrar self-service sites, no
nodal officer or registrar contacts, no CIN/ISIN registry and no step-by-step filing
instructions appear on public or client pages; they live only in the staff screens and the
`/admin/companies` API.

> **Real data only.** The database holds no fabricated investors. The seed loads the 15
> companies and their sourced corporate actions; investor records come only from companies'
> published IEPF-2 / IEPF-4 statements; prices come from the live exchange sync. The scale
> benchmark (`npm run bench:partitions`) writes generated rows only to a separate database whose
> name must end in `_bench`.

---

## Monorepo

```
apps/
  web/        Next.js 16 (App Router) + Tailwind 4 + shadcn/ui + Recharts: site, portal, partner desk, admin
  api/        NestJS 12 (ESM) API + BullMQ worker: 3-Minute Check, Login Gateway, live refresh,
              market data and valuation reports, cases, CRM, associates, ETL
packages/
  shared/     Domain enums, name phonetics, masking, corporate-action and fee maths, R.E.C.O.V.E.R.
              rules, document checklists, reference companies and services (used by api, web and seed)
  db/         Prisma 7 schema, SQL migrations (pg_trgm + fuzzystrmatch), seed, field encryption,
              and a local PostgreSQL 18 that needs no install
```

## Setup

Requirements: Node.js 20.19+ (24 recommended) and npm 11. No Docker, Postgres or Redis needed for
development.

```bash
npm install
npm run build:packages        # shared + db (generates the Prisma client)
npm run db:start              # terminal 1: PostgreSQL 18 on :54329, data in .data/pg
npm run db:migrate
npm run db:seed               # catalogue + first admin (see below)
npm run build -w @recoveryos/api && npm run dev:api     # terminal 2: API on :4000/api/v1
npm run dev:web               # terminal 3: web on :3000
```

The seed creates a `SUPER_ADMIN` on `SEED_ADMIN_PHONE`, or, outside production, on the default
development number 9000000001. Production never gets the default: whoever holds that number
would receive the admin's login code. Sign in at `/login`; in development the code is printed in
the API log (`Development OTP for +91…`). Staff, partners and clients are created from the app
(clients when a lead is converted, partners at `/partners/join`); role changes are an admin task.

### Loading real investor data

Investor records come from the statutory statements companies publish under the IEPF Rules.

```bash
# One statement, from a file or straight from the company's site (.xlsx, .xls, .csv or .pdf)
npm run ingest:iepf -w @recoveryos/db -- --cin L24230DL1975PLC007908 \
  --file https://www.dabur.com/sites/default/files/2021-06/61617-l24230dl1975plc007908_6.pdf
npm run ingest:iepf -w @recoveryos/db -- --slug state-bank-of-india --file ./sbi-iepf4.xlsx --dry-run

# Find and download statement files linked from companies' investor pages (polite, robots-aware)
npm run fetch:iepf -w @recoveryos/db -- --all [--ingest]
npm run fetch:iepf -w @recoveryos/db -- --company dabur-india-limited --url <investor page>
```

Admins can also upload statements at `/admin/ingestion`. The parser reads the MCA statutory
columns as filed (investor and father/husband name parts, address, country, state, district, PIN,
folio or DP ID-client ID, investment type, amount transferred or number of shares, date of event
or proposed transfer date), including MCA's own e-form template, title blocks, multi-line
headers, "Number of underlying Shares" rows and PDF tables (including sideways pages). A missing
state is taken from the PIN code; with neither, the holder is kept as "state not on the
statement" and appears in every state's search. Amounts are kept per statement date, so a later
year's statement adds to a holder's total and re-importing a file never double counts. Bonuses
and splits dated after a row's transfer date are applied to its share count.

Checked against real published statements: three Dabur IEPF-2 PDFs (8,481–9,870 holders each,
16,539 distinct holders loaded locally), MCA's IEPF-2 e-form `.xls` from Info Edge (22,975 rows,
none skipped), and IEPF-2 PDFs from Tata Capital and StockHolding. Pages that load their lists
through forms or scripts (Reliance's year picker, Wipro's KFin search form) cannot be fetched
automatically: download those statements and upload them.

| Script (root)                                              | What it does                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run db:start` / `db:migrate` / `db:seed` / `db:reset` | Local Postgres; apply migrations; seed; drop and rebuild (local only)                |
| `npm run dev:api` / `dev:worker` / `dev:web`               | API (tsc watch + node --watch), BullMQ worker (needs `REDIS_URL`), web               |
| `npm test`                                                 | Shared unit tests (22) and API tests (32) against a fresh `recoveryos_test` database |
| `npm run typecheck` / `npm run lint` / `npm run build`     | Across all workspaces                                                                |

**Drop folder.** Files placed in `data/pan-india-drop/` are loaded by
`npm run ingest:pan-india -w @recoveryos/db` (`-- --watch` keeps polling): IEPF-2/IEPF-4 and
registrar statements stream into the state partitions; BSE's "List of Scrips" export and NSE's
equity lists fill the calculator's directory. Rows are matched to companies by CIN, current or
legacy ISIN (Bajaj Finance's pre-split `INE296A01024` maps to `INE296A01032`) or name, or by a
file name starting with a CIN, ISIN or slug. Download each file yourself from its source: the
tools never fetch from sites that refuse automated clients, so BSE and registrar data arrive
through this folder or a licensed feed.

### Environment

Every integration has a local adapter, and setting its variables switches it to the real
service. `/api/v1/health` reports which adapter each one is running on. Production refuses
to start with development secrets or adapters.

| Variable                                               | Default                                    | Purpose                                                                                            |
| ------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                         | local embedded Postgres                    | Any PostgreSQL 15+ with `pg_trgm` and `fuzzystrmatch` (Supabase works)                             |
| `JWT_SECRET`, `OTP_SECRET`                             | dev values                                 | 32+ chars each; sessions and OTP hashes                                                            |
| `FOLIO_ENCRYPTION_KEY`, `FOLIO_HASH_KEY`               | derived dev keys                           | 32 bytes base64: AES-256-GCM for folio numbers, HMAC blind index                                   |
| `OTP_PROVIDER`                                         | `console`                                  | `msg91` (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) or `twilio` (`TWILIO_*`)                           |
| `ESIGN_PROVIDER`                                       | `mock`                                     | `digio` (`DIGIO_CLIENT_ID/SECRET`) or `leegality` (`LEEGALITY_AUTH_TOKEN`); `ESIGN_WEBHOOK_SECRET` |
| `STORAGE_PROVIDER`                                     | `local` (AES-256-GCM files in `.uploads/`) | `s3` with `S3_BUCKET`, `S3_REGION`, `S3_KMS_KEY_ID` (SSE-KMS)                                      |
| `REDIS_URL`                                            | unset: jobs run inline                     | BullMQ queue; run `npm run dev:worker`                                                             |
| `MEILI_HOST`, `MEILI_API_KEY`                          | unset: Postgres search                     | Meilisearch, with automatic fallback to Postgres on any error                                      |
| `MARKET_SYNC_ENABLED`, `MARKET_SYNC_INTERVAL_MINUTES`  | on (off under test), 15                    | Live prices from NSE, falling back to Yahoo Finance (.NS, then .BO); daily dividend history        |
| `SEED_ADMIN_PHONE`, `SEED_ADMIN_NAME`                  | unset                                      | First administrator created by `npm run db:seed`                                                   |
| `VALUATION_REPORTS_PER_DAY`, `MEMBER_SEARCHES_PER_DAY` | 2, 60                                      | Per-mobile report limit; member checks per day                                                     |
| `LIVE_SYNC_ENABLED`, `LIVE_SYNC_TTL_HOURS`             | on (off under test), 24                    | Live refresh of company-published statements behind each search                                    |
| `FINSOL_API_URL` (web)                                 | `http://localhost:4000/api/v1`             | Where the web server reaches the API (`RECOVERYOS_API_URL` still read)                             |
| `NEXT_PUBLIC_SITE_URL` (web)                           | `http://localhost:3000`                    | Canonical URLs, sitemap, referral links                                                            |

See `.env.example` for the full list.

## Platform architecture

**3-Minute Check.** `GET /api/v1/search/unclaimed` takes `fullName` (or first/middle/last), a
mandatory `state` and an optional `jointHolderName`; both names are searched and each result says
which one matched. Search runs in two phases inside the state's partition (plus `UNKNOWN`, holders
whose statement gives no state):

1. exact Indian phonetic keys for every name part (Agarwal, Agrawal and Aggarwal all give AGRVL),
   answered from a composite `(last_name_key, first_name_key)` index;
2. only if that finds fewer than 10: a fuzzy phase whose candidates come from two bounded
   branches (200 rows each), both answered by B-tree lookups:
   - **sound-alike:** Double Metaphone of surname and first name together, from a composite
     `(dmetaphone(last), dmetaphone(first))` index;
   - **spelling:** the 20 closest real spellings of each name part, found by trigram similarity
     (`pg_trgm`, threshold 0.45, `gin_fuzzy_search_limit = 500`) in `name_words`, a vocabulary of
     distinct name words kept up to date by every import, then looked up exactly in a
     `(last_name_norm, first_name_norm)` index.

   The candidates are then checked against every part, including initials, the generated
   `name_tokens` word array and the phonetic key, and scored. Trigram scans never touch the folio
   table: on a partition holding millions of rows they cost 13–40 ms even when nothing matched.

What a row reveals depends on the caller (`access` on every result):

| Caller                 | Sees                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| public                 | holder, father/spouse, city, state, custody; company and folio masked        |
| member (Login Gateway) | + company, shares after bonuses/splits, value, dividends; folio still masked |
| staff                  | everything, including the decrypted folio                                    |

A member's folio numbers unmask only once released: by an analyst (`POST
crm/leads/:id/release-folios` or `POST cases/:code/release-folio`), or automatically when the
client eSigns their Digital Mandate. `POST search/claim` turns
the member's selection into a CRM lead with the least-loaded analyst. Members get
`MEMBER_SEARCHES_PER_DAY` checks a day.

**Namesakes and tenant isolation.** Thousands of shareholders share a name, even within one
state, so nothing is ever grouped or unlocked by name:

- `unclaimed_folios.investor_cluster_id` is a stored SHA-256 of the holder's name, father or
  spouse, PIN, city and state (`investor_cluster_id()` in `migrations/20261103000000_isolation`).
  Search results carry it as a "Holder ID" with the father/spouse, city and masked PIN
  (`400***`). The web app warns when a selection spans more than one Holder ID.
- A member sees a folio number only when it was released to _their_ verified mobile (an analyst
  release on their lead, or their own signed mandate), never because they share a name.
- Clients' case, document and lead reads run as the `finsol_app_client` role with `app.user_id`
  set for the transaction, so Postgres row-level security on `recovery_cases`, `case_documents`,
  `leads_and_inquiries` and `valuation_reports` returns only their own rows, whatever the query
  asks for. Staff paths run as the owner. In production, grant `finsol_app_client` to the API's
  database user.
- `recovery_cases (folio_id, client_user_id)` is unique. When someone claims a holding that
  another client already has a case or open request on, their lead is kept separate and flagged
  `DUPLICATE_CLAIMANT_REVIEW` on the CRM board; it cannot become a case until an analyst marks it
  reviewed.

**All India.** The 3-Minute Check offers "All India (Pan-India Search)" for families who moved
across states; it searches every partition. Searches run on a dedicated connection pool as named
prepared statements with cached generic plans (`plan_cache_mode = force_generic_plan`): planning
a query over 38 partitions costs about 5 ms, running it under 1 ms. The pool's connections also
carry the fuzzy-match settings (trigram threshold 0.45, `gin_fuzzy_search_limit = 500`).

**Warm after restarts.** On start-up the API runs `pg_prewarm` over every partition's search
indexes (`PREWARM_ENABLED`, on outside tests), in the background. For a warm buffer cache across
database restarts as well, add `pg_prewarm` to `shared_preload_libraries` so its autoprewarm
worker restores it.

**Live refresh.** Each search returns a `liveRefreshId`; `GET search/live/:id` streams
server-sent events while `LiveMcaSyncService` (`apps/api/src/modules/search/live-mca-sync.service.ts`)
re-reads the companies' investor-relations pages (at most once per company per
`LIVE_SYNC_TTL_HOURS`) and bulk-loads any statement not yet imported. The browser only sees the
id and counts. Sources are pluggable; MCA's IEPF investor search is CAPTCHA-protected with no
public API, so it is **not** scraped. An authorised MCA or registrar feed can be added as another
`UpstreamSource`.

**Scale: state partitions and bulk COPY.** `unclaimed_folios` is `PARTITION BY LIST (state)`:
36 states and union territories + `OUT_OF_INDIA` (37), plus one for `UNKNOWN`. Its primary key
is `(id, state)`, so `recovery_cases.folio_id` is checked by the application rather than a
foreign key. Prisma's schema cannot express partitioning: apply migrations with
`prisma migrate deploy` only, never `prisma migrate dev`, which would try to undo it.

Imports stream rows into an unlogged staging table with binary `COPY … FROM STDIN`. Then:

- **Up to 200,000 rows: merge in place**, in one transaction: existing holders (same company,
  folio and name) gain the new statement's per-date amounts; the rest are inserted.
- **More: rebuild each affected state partition.** Its live rows and the staged rows (merged the
  same way) go into an unindexed `unclaimed_folios_load_<state>` table; every index is built once
  (`maintenance_work_mem = 2GB`, `max_parallel_maintenance_workers = 8`, four states at a time);
  foreign keys are validated; then one short transaction runs `DETACH PARTITION` /
  `ATTACH PARTITION` and drops the old table. Searches read the old partition until the swap. Measured on this machine (`npm run bench:partitions`, generated rows in
  `recoveryos_bench`): see "Measured performance" below.

**Meilisearch (optional).** With `MEILI_HOST`, folios are indexed one index per state
(`folios_maharashtra`, …, `folios_unknown`) and a search multi-queries its state and `UNKNOWN`,
falling back to Postgres on any error.

**Login Gateway.** `POST auth/otp/request` then `POST auth/otp/verify` with `name`, `email` and
the 6-digit code. OTPs live 5 minutes, allow 5 tries, are stored as an HMAC and are rate-limited.
The web app's `/api/v1/*` backend-for-frontend keeps the session in an httpOnly cookie
(`fe_session`), so browser JavaScript never sees a token.

**Calculator and valuation reports.** `GET market/equities?q=` searches `listed_equities`, loaded
daily from NSE's main-board and SME (Emerge) lists, about 3,200 equities. BSE refuses automated
requests that identify themselves honestly (its scrip master and bhavcopy files return 403), and
the service does not pose as a browser, so BSE-only listings come from Yahoo Finance's search at
query time. A licensed BSE or depository data feed would make the directory complete. `GET market/equities/:exchange/:symbol` returns the live price,
bonus/split history (hand-verified for catalogue companies and the one-click examples, otherwise
the exchange record) and dividends per share as paid. `POST valuation/report` (signed in) recomputes
everything server-side and returns the PDF; reports are recorded in `valuation_reports`.

**Custom pricing.** No percentage appears publicly. `recovery_cases.agreed_success_fee_pct` is
empty until staff set it (`PATCH cases/:code/fee`); the Digital Mandate cannot be generated or
signed before that, and a CHECK constraint refuses a signed mandate without a fee. The fee is
fixed once the mandate is issued.

**Data model.** There are 13 tables (migrations: init, search and integrity, enum values, real-data fields, per-event amounts). The 7 core tables are `companies`, `corporate_actions`,
`unclaimed_folios`, `leads_and_inquiries`, `recovery_cases`, `case_documents` and `associates`.
The 6 supporting tables are `users`, `otp_challenges`, `case_events`, `commission_ledger`,
`ingestion_jobs` and `audit_events`. The second migration adds what Prisma cannot express:

- the extensions and the trigram, Soundex and Double Metaphone indexes;
- CHECK constraints: step 1 to 7, no step 6 without a signed mandate, no step 7 without an SRN,
  and the folio column must hold ciphertext;
- an append-only audit log, enforced by trigger even for the table owner.

`folio_number` is AES-256-GCM ciphertext, with a masked copy and an HMAC blind index for
de-duplication.

**Market data.** `apps/api/src/market` writes `current_market_price`, `price_updated_at` and
`price_source` on start-up and every 15 minutes: NSE's quote API first, then Yahoo Finance's
chart API. Requests identify Finsol Enterprises honestly and never imitate a browser, so when NSE
refuses automated clients (it answers 403 from most servers) Yahoo supplies the NSE price. A
failed fetch keeps the last real price; no price is ever invented, and pages show "price
pending" until the first sync. Dividends per share for the last ten years come from Yahoo
Finance daily, scaled back from Yahoo's split adjustment. `GET /api/v1/market/prices` shows each
company's price, source and time; `POST /api/v1/market/sync` (admin) runs a sync now.

**Company catalogue.** `packages/shared/src/reference/companies.ts` is the single source for
the 15 companies' identifiers, nodal officers (with deputies, emails, phones and addresses),
registrars and corporate actions, each action tagged with its source. Bonus and split dates
were checked against the exchange split history; where that history shows a combined split and
bonus as one ratio, the announced components are kept and noted. State Bank of India has no
CIN (it is constituted under the SBI Act, 1955), so its CIN is empty and the statute is recorded.

**R.E.C.O.V.E.R.** The seven steps are Ring up, Evaluate, Check, Offer, Verify, Employ and
Realize. They advance one at a time, by staff only, through `canAdvanceRecoverStep`, and the
database constraints repeat the same rules. At step 5 the client reads the generated Digital
Mandate PDF (carrying the fee staff set for the case) and signs it with Aadhaar eSign. Clients
see these seven internal steps as Finsol's four public ones. The mandate only becomes "signed" through a verified
provider webhook; the development provider routes its simulated signature through the same
webhook check. When a referred case is credited, the associate's 30% share of the fee accrues
to the commission ledger exactly once.

**Document vault.** The checklist depends on the scenario: standard IEPF-5, duplicate shares,
deceased transmission, NRI or physical-to-demat. Uploads must be PDF, JPG or PNG up to 10 MB.
Each file is stored encrypted with its SHA-256 recorded, then reviewed by staff (verify, or send
back with a reason). Downloads are authorised and audited.

**ETL.** `POST /api/v1/admin/ingestion` accepts an IEPF-2 or IEPF-4 investor-wise statement as
`.csv` or `.xlsx`. Headers are matched by alias, and the header row is found below any title
block. Rows for the same (company, folio, holder) are grouped, then bulk-loaded with binary
COPY and merged in one statement.
Invalid rows are skipped with a reason. A background job does the parsing (BullMQ, or inline
without Redis), then syncs Meilisearch when it is configured.

**API surface** (all under `/api/v1`):

- Public: `health`, `stats`, `companies`, `companies/:slug` (no contacts or identifiers),
  `search/unclaimed`, `search/live/:id` (SSE), `market/prices`, `market/equities`,
  `market/equities/:exchange/:symbol`, `auth/otp/request`, `auth/otp/verify`,
  `associates/locator`, `associates/referral/:code`, `webhooks/esign/:provider`.
- Signed in: `auth/me`, `search/claim`, `valuation/report`, `cases`, `cases/:code`,
  `cases/:code/esign/start`, `cases/:code/mandate`, `cases/:code/documents/:docType`, `…/file`,
  `associates/register`.
- `ASSOCIATE_PARTNER`: `associates/me` and `associates/me/leads`.
- Staff: `admin/companies`, `admin/companies/:slug`, `cases/:code/advance`,
  `cases/:code/tracking`, `cases/:code/fee`, `cases/:code/release-folio`,
  `PATCH cases/:code/documents/:docType`, `crm/board`, `crm/team`, `crm/leads/:id`,
  `crm/leads/:id/convert`, `crm/leads/:id/release-folios`, `crm/cases/move`.
- `LEGAL_OPS_EXEC` or `SUPER_ADMIN`: `admin/ingestion…`.

---

## Measured performance

Measured on the development machine (24 cores, embedded PostgreSQL 18) with
`npm run bench:partitions`, which writes generated holders only to `recoveryos_bench`
(dropped afterwards). 50,000,000 rows; the largest partition (Maharashtra) holds 8.79M. Search
runs as the API does: prepared statements with cached generic plans, 400 queries per set.

| Measure                                                       | Result                             |
| ------------------------------------------------------------- | ---------------------------------- |
| Streaming 50M rows with binary COPY (generation + encryption) | 884 s, ~57,000 rows/s (Node-bound) |
| Rebuild + swap of all 38 partitions (4 at a time)             | ~8.4 min (Maharashtra: 271 s)      |
| Total load                                                    | ~23 min                            |
| Re-import of a real 9,997-row Dabur statement (merge mode)    | 127 ms COPY + 628 ms merge         |

| Search (p50 / p95 / p99, ms) | One state          | All India          |
| ---------------------------- | ------------------ | ------------------ |
| Common names (key match)     | 0.40 / 3.83 / 7.24 | 0.58 / 0.88 / 9.58 |
| Misspelt names               | 0.37 / 0.59 / 4.41 | 0.56 / 0.77 / 1.00 |
| No phonetic match (fuzzy)    | 0.77 / 1.37 / 2.01 | 1.16 / 1.59 / 9.49 |

The p99 values include each connection's first use of a statement, before its plan is cached.
With an empty OS cache after a machine restart, an earlier run measured common-name p95 at 6.7 ms
until the indexes were read in; the API's start-up `pg_prewarm` exists for this. Its effect on a
truly cold machine was not measured here, since that needs root to drop the OS page cache. The
generated data uses ~200 distinct name words; real data has far more, which makes the vocabulary
lookup a little slower. Streaming is limited by row generation and AES encryption in one Node
process.

## Web app (apps/web)

- Public: `/` (3-Minute Check hero, 4-step service, custom pricing, contact desks), `/search`,
  `/calculator`, `/services`, `/services/[slug]`, `/unclaimed-shares`,
  `/unclaimed-shares/[company-slug]` (price, bonus/split history, the 4-step service; no
  contacts or filing steps), `/partners`, `/login` (Login Gateway), `sitemap.xml`, `robots.txt`.
- Signed in: `/portal`, `/portal/cases/[code]` (4-step tracker; staff also see R.E.C.O.V.E.R.,
  the fee and folio-release controls and the company file), `/partners/join`,
  `/partners/dashboard`.
- Staff: `/admin/crm`, `/admin/companies`, `/admin/companies/[slug]`, `/admin/ingestion`.

The MVP's illustrative `/check` triage and `/cases` sample cases were removed in 0.3: they held
fictional people and spelled out the self-filing route.

## Quality gates

- **WCAG 2.2 AA.** Focus is visible everywhere: one global 2px signal-blue outline, never removed.
  Other measures:
  - A skip link, one `h1` per page, landmarks, and breadcrumbs with `aria-current`.
  - Status is never shown by colour alone. Every badge has a text label and icon, and the
    rail has visible captions plus screen-reader state text.
  - Form errors link to their fields, are announced, and receive focus. Focus moves to each
    new triage question and to the result.
  - Body text is 16px or larger; `text-sm` (15px) is used only for metadata. Touch targets
    are at least 44px.
  - axe-core (WCAG 2.0/2.1/2.2 A + AA, plus best practice) reports **0 violations** on every
    route at 1440px, 390px and 320px.
- **320px layout.** No horizontal page scroll on any route at 320px (checked in Chromium).
  The rail collapses to a progress bar plus an expandable list, and tables become cards.
- **Motion.** UI transitions are 160 to 260ms on one easing family and animate `transform`
  and `opacity` only; nothing loops and skeletons do not shimmer. Functional product screens
  have no scroll reveals. `prefers-reduced-motion` collapses animation, and
  `prefers-reduced-transparency` and `prefers-contrast: more` are handled.
- **States.** Every data route has a `loading.tsx` with static skeletons. There are error
  boundaries (`error.tsx`, `global-error.tsx`) and `not-found` pages, including one for a
  case you may not see ("we don't say which").
  - Empty states: a case with no documents, no estimate or no tasks.
  - Extraction states: reading now, couldn't read, needs checking.

## Launch-gate checklist

Nothing here is done yet. **No real client documents are accepted until every item under
"Security and data" is verified in the target environment.**

### Consent and privacy (DPDP Act, 2023)

- [ ] Consent notice reviewed by counsel against the DPDP Act and the DPDP Rules as notified:
      itemised purposes, plain language, available in English and the client's language.
      Withdrawing must be as easy as giving.
- [ ] Consent records written to `consents`, with notice version. Withdrawal stops
      processing for that purpose and is logged.
- [ ] Grievance officer / contact published. Breach-notification runbook (Data Protection
      Board and affected clients) written and rehearsed.
- [ ] Retention schedule per document category (`evidence_files.retention_until`), plus an
      erasure procedure: redact personal data, delete storage objects, keep the audit trail.
- [ ] Heir cases: basis for processing a deceased holder's and other heirs' data confirmed.

### Counsel review

- [ ] Whether assisting with IEPF / RTA claims for a success fee needs any registration,
      licence or authorisation model (for example, an authority letter or power of attorney),
      and where legal advice must come from an advocate.
- [ ] Success-fee terms: valuation on the credit date, invoicing after credit, GST, stopping
      before filing at no charge, and disputes.
- [ ] The 10% protection allocation: IRDAI rules on referral or corporate-agency
      arrangements; that it is opt-in and never a condition of service; the "stays with you"
      wording.
- [ ] Every claim on the landing page, including "we never guarantee recovery", the fee
      example and the anti-fraud notice.
- [ ] Route rule set `iepf-triage-2026.09-r1` (statutory references and thresholds) before
      it is published into `rule_versions`.
- [ ] Terms of service and privacy policy.

### Security and data (must pass before any real document)

- [ ] Migration applied to the production project, and `supabase/verify/behaviour.sql` run
      against a staging branch with real Auth users.
- [ ] **Audit log verified.** Every write path produces an audit event, and the hash chain
      re-verifies end to end.
- [ ] **RLS verified.** Cross-client isolation tested with two real accounts. `anon` reads
      nothing. The service-role key never reaches the browser.
- [ ] **Backups verified.** Automated backups on, and a restore actually performed and
      checked. The Supabase free tier has limited backups and no point-in-time recovery, so
      either move to a paid plan or schedule encrypted `pg_dump`s off-site, and test a
      restore.
- [ ] Storage: private bucket, RLS on `storage.objects`, short-lived signed URLs, malware
      scan, size and type limits (matching `evidence_files` constraints).
- [ ] Only masked Aadhaar accepted. PAN kept to its last 4 characters in columns.
- [ ] Rate limiting on server actions and auth. Security headers (CSP, HSTS). Dependency
      audit.
- [ ] Incident response plan, including CERT-In's 6-hour reporting requirement.
- [ ] Independent security review or penetration test.

### Platform (0.2)

- [ ] **Data licensing.** Investor-wise IEPF data is published by companies and the IEPF Authority. Confirm with counsel that
      indexing it, and showing teaser fields about named private individuals, is permitted. Decide on a DPDP basis, a takedown
      route and how long records are kept.
- [ ] **Reference data.** Verify every company's CIN, ISIN, registrar, corporate actions and nodal officer against primary
      sources. Replace sample prices with an exchange feed.
- [ ] **OTP.** Register a DLT sender ID and template for MSG91 or Twilio. Load-test the rate limits. Confirm that the anti-fraud
      copy ("we never ask you to read out a code") matches every script the call team uses.
- [ ] **eSign.** Sign a Digio or Leegality contract. Confirm their request fields and webhook signature scheme against the
      adapters in `apps/api/src/common/providers/esign.provider.ts`. Have the Digital Mandate reviewed by counsel.
- [ ] **Storage.** Private S3 bucket with SSE-KMS, a malware scan on upload and a retention schedule. Generate keys for
      `FOLIO_*` and `STORAGE_ENCRYPTION_KEY` in a KMS, with a rotation procedure.
- [ ] **Associates.** Write a partner agreement covering the 30% share, verification of professional membership, a payout
      process and TDS.

### Product

- [ ] Real registry connectors only through permitted channels. Otherwise keep "Not queried".
- [x] Live exchange prices (NSE, then Yahoo Finance) replace sample prices. Before launch, consider a licensed market-data feed and check its terms of use.
- [ ] Screen-reader pass with NVDA, VoiceOver and TalkBack; content in at least one Indian
      language besides English.
- [ ] Counsel review of the confidentiality model: the public pages no longer describe the free
      self-filing route, and client folio numbers stay masked until released. Confirm this meets
      consumer-protection and SEBI/IEPFA guidance on intermediaries before launch.
