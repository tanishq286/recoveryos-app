# RecoveryOS

A recovery platform for unclaimed investments in India. The first wedge is **IEPF shares and
dividends**: shares a company moved to the Investor Education and Protection Fund after seven
years of unclaimed dividends, which the holder (or their heirs) can claim back on Form IEPF-5.

Version 0.2 turns the MVP into a platform: a public name + state search over companies'
IEPF-2/IEPF-4 filings with a teaser-to-unlock flow, programmatic company guides, a
corporate-action and fee calculator, a client portal with the seven-step R.E.C.O.V.E.R.
tracker, Aadhaar eSign and a document vault, an associate partner programme, and an admin
workspace with a CRM board and a filings importer.

> **Demo data.** Every person, folio, phone number and case in the seed is fictional. Company
> identifiers, registrars and corporate actions are reference data compiled for this build and
> prices are samples: verify them before relying on them. Do not upload real documents. See the
> [launch-gate checklist](#launch-gate-checklist).

---

## Monorepo

```
apps/
  web/        Next.js 16 (App Router) + Tailwind 4 + shadcn/ui + Recharts: site, portal, partner desk, admin
  api/        NestJS 12 (ESM) API + BullMQ worker: search/unlock, auth, cases, CRM, associates, ETL
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
npm run db:migrate && npm run db:seed
npm run build -w @recoveryos/api && npm run dev:api     # terminal 2: API on :4000/api/v1
npm run dev:web               # terminal 3: web on :3000
```

Sign in at `/login` with a seeded number; in development the code is printed in the API log
(`Development OTP for +91…`).

| Who                                                | Mobile      | Lands on                         |
| -------------------------------------------------- | ----------- | -------------------------------- |
| Client with two cases (RC-2026-1001, RC-2026-1004) | 90000 00011 | `/portal`                        |
| Client at step 5, ready to eSign (RC-2026-1003)    | 90000 00013 | `/portal`                        |
| Valuation analyst                                  | 90000 00002 | `/admin/crm`                     |
| Legal operations                                   | 90000 00004 | `/admin/crm`, `/admin/ingestion` |
| Associate partner (MEERA-PUN)                      | 90000 00021 | `/partners/dashboard`            |
| Administrator                                      | 90000 00001 | everything                       |

Try `/search?lastName=Agarwal&state=DELHI`: Agarwal, Agrawal and Aggarwal come back together,
masked. Select one, unlock it with any mobile number and the code from the API log, and the
company, registrar and folio appear while the lead lands on the CRM board.

| Script (root)                                              | What it does                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run db:start` / `db:migrate` / `db:seed` / `db:reset` | Local Postgres; apply migrations; seed; drop and rebuild (local only)                           |
| `npm run dev:api` / `dev:worker` / `dev:web`               | API (tsc watch + node --watch), BullMQ worker (needs `REDIS_URL`), web                          |
| `npm test`                                                 | Shared unit tests (20) and API end-to-end tests (26) against a fresh `recoveryos_test` database |
| `npm run typecheck` / `npm run lint` / `npm run build`     | Across all workspaces                                                                           |

### Environment

Every integration has a local adapter, and setting its variables switches it to the real
service. `/api/v1/health` reports which adapter each one is running on. Production refuses
to start with development secrets or adapters.

| Variable                                        | Default                                    | Purpose                                                                                            |
| ----------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                  | local embedded Postgres                    | Any PostgreSQL 15+ with `pg_trgm` and `fuzzystrmatch` (Supabase works)                             |
| `JWT_SECRET`, `UNLOCK_JWT_SECRET`, `OTP_SECRET` | dev values                                 | 32+ chars each; separate secrets for sessions, unlock tokens, OTP hashes                           |
| `FOLIO_ENCRYPTION_KEY`, `FOLIO_HASH_KEY`        | derived dev keys                           | 32 bytes base64: AES-256-GCM for folio numbers, HMAC blind index                                   |
| `OTP_PROVIDER`                                  | `console`                                  | `msg91` (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`) or `twilio` (`TWILIO_*`)                           |
| `ESIGN_PROVIDER`                                | `mock`                                     | `digio` (`DIGIO_CLIENT_ID/SECRET`) or `leegality` (`LEEGALITY_AUTH_TOKEN`); `ESIGN_WEBHOOK_SECRET` |
| `STORAGE_PROVIDER`                              | `local` (AES-256-GCM files in `.uploads/`) | `s3` with `S3_BUCKET`, `S3_REGION`, `S3_KMS_KEY_ID` (SSE-KMS)                                      |
| `REDIS_URL`                                     | unset: jobs run inline                     | BullMQ queue; run `npm run dev:worker`                                                             |
| `MEILI_HOST`, `MEILI_API_KEY`                   | unset: Postgres search                     | Meilisearch, with automatic fallback to Postgres on any error                                      |
| `RECOVERYOS_API_URL` (web)                      | `http://localhost:4000/api/v1`             | Where the web server reaches the API                                                               |
| `NEXT_PUBLIC_SITE_URL` (web)                    | `http://localhost:3000`                    | Canonical URLs, sitemap, referral links                                                            |

See `.env.example` for the full list.

## Platform architecture

**Search (teaser to unlock).** `GET /api/v1/search/unclaimed` takes `firstName`, `middleName`,
`lastName` or `fullName`, a mandatory `state` and an optional `custodyStatus`, and resolves to
one of four modes: full name (two or more parts), first only, middle only, or surname only.
Every name part given must match, by any of:

- trigram similarity (`pg_trgm`, GIN indexes on each part);
- an Indian-transliteration phonetic key computed in `packages/shared/names.ts`, so that
  Agarwal, Agrawal and Aggarwal give AGRVL, and Chaudhary and Chowdhury give CDR;
- Soundex with Levenshtein distance up to 3 (`fuzzystrmatch`, with expression indexes scoped by
  state).

A single letter matches as an initial. Typical query time on the seed is under 5 ms.

Unverified callers get the holder, father or spouse, city, state, custody status, post-action
shares and an estimated value, with the company masked (`R******e Industries Ltd`) and the folio
masked (`RIL***21`). `POST /api/v1/search/unlock` takes the claimant's name, phone, a one-time
code, relationship to the holder and certificate status. It verifies the code, records or merges
the lead, assigns the least-loaded valuation analyst, queues a notification and returns an
unlock JWT covering only the chosen folios. The web app keeps that token (and the session) in
httpOnly cookies through its `/api/v1/*` backend-for-frontend route, so browser JavaScript never
sees a token.

Guard rails: OTPs are 6 digits, live 5 minutes, allow 5 tries, are stored as an HMAC and are
rate-limited (one every 30 s, five an hour per phone). Each phone may make 5 unlocks a day, with
at most 10 folios per unlock. Search is IP-throttled and every unlock is audited.

**Data model.** There are 13 tables. The 7 core tables are `companies`, `corporate_actions`,
`unclaimed_folios`, `leads_and_inquiries`, `recovery_cases`, `case_documents` and `associates`.
The 6 supporting tables are `users`, `otp_challenges`, `case_events`, `commission_ledger`,
`ingestion_jobs` and `audit_events`. The second migration adds what Prisma cannot express:

- the extensions and the trigram, Soundex and Double Metaphone indexes;
- CHECK constraints: step 1 to 7, no step 6 without a signed mandate, no step 7 without an SRN,
  and the folio column must hold ciphertext;
- an append-only audit log, enforced by trigger even for the table owner.

`folio_number` is AES-256-GCM ciphertext, with a masked copy and an HMAC blind index for
de-duplication.

**R.E.C.O.V.E.R.** The seven steps are Ring up, Evaluate, Check, Offer, Verify, Employ and
Realize. They advance one at a time, by staff only, through `canAdvanceRecoverStep`, and the
database constraints repeat the same rules. At step 5 the client reads the generated Scope of
Work PDF and signs it with Aadhaar eSign. The mandate only becomes "signed" through a verified
provider webhook; the development provider routes its simulated signature through the same
webhook check. When a referred case is credited, the associate's 30% share of the fee accrues
to the commission ledger exactly once.

**Document vault.** The checklist depends on the scenario: standard IEPF-5, duplicate shares,
deceased transmission, NRI or physical-to-demat. Uploads must be PDF, JPG or PNG up to 10 MB.
Each file is stored encrypted with its SHA-256 recorded, then reviewed by staff (verify, or send
back with a reason). Downloads are authorised and audited.

**ETL.** `POST /api/v1/admin/ingestion` accepts an IEPF-2 or IEPF-4 investor-wise statement as
`.csv` or `.xlsx`. Headers are matched by alias, and the header row is found below any title
block. Rows for the same (company, folio, holder) are grouped, then upserted in batches of 250.
Invalid rows are skipped with a reason. A background job does the parsing (BullMQ, or inline
without Redis), then syncs Meilisearch when it is configured.

**API surface** (all under `/api/v1`):

- Public: `health`, `stats`, `companies`, `companies/:slug`, `search/unclaimed`, `search/unlock`,
  `auth/otp/request`, `auth/otp/verify`, `associates/locator`, `associates/referral/:code`,
  `webhooks/esign/:provider` (verified by signature).
- Signed in: `auth/me`, `cases`, `cases/:code`, `cases/:code/esign/start`, `cases/:code/mandate`,
  `cases/:code/documents/:docType` (upload), `…/file`, `associates/register`.
- `ASSOCIATE_PARTNER`: `associates/me` and `associates/me/leads`.
- Staff: `cases/:code/advance`, `cases/:code/tracking`, `PATCH cases/:code/documents/:docType`,
  `crm/board`, `crm/team`, `crm/leads/:id`, `crm/leads/:id/convert` and `crm/cases/move`.
- `LEGAL_OPS_EXEC` or `SUPER_ADMIN`: `admin/ingestion…`.

**Web routes added in 0.2.**

- Public: `/search`, `/services` (11 verticals), `/services/[slug]`, `/unclaimed-shares` and
  `/unclaimed-shares/[company-slug]`. The company guides are statically generated with hourly
  revalidation, carry HowTo and BreadcrumbList JSON-LD, and fall back to the shared catalogue
  if the API is down at build time.
- Also public: `/calculator`, `/partners` (pitch plus state and city locator), `/login`,
  `sitemap.xml` and `robots.txt`.
- Signed in: `/portal`, `/portal/cases/[code]`, `/partners/join`, `/partners/dashboard`,
  `/admin/crm` and `/admin/ingestion`.

---

## Web app (apps/web)

Paths in the rest of this section are relative to `apps/web`. The original MVP screens
(`/check`, `/cases`, the evidence room) still run on the typed mock data layer described below.

## Screens

| Route                  | What it shows                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                    | Landing page: the promise and quick-scan bar, the seven-year rule and the way back, how it works (evidence room → recovery engine → trust layer), what we don't do, free official routes beside paid help, pricing, and an anti-fraud notice.                                                                                                                                                                            |
| `/check`               | Guided triage: one question per screen with a clickable stepper (jump back to any answered step and forward again), four holding cards, and a diagnostic receipt to review answers. Accepts `?asset=&issuer=&ref=` from the home page's quick-scan bar. The result gives a route assessment, exact "insufficient evidence" states and a timestamped **sources checked** receipt.                                         |
| `/cases`               | The three sample cases.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/cases/rc-2026-0147`  | Mid-review case: value at stake and a KPI strip, then two panes. Milestones: the next-step card, the six-stage IEPF lifecycle tracker (over the 12 case states), tasks and activity. Document inspector: a forensic page preview, proof cards with a grounded confidence line and an Approve / Flag a discrepancy switch, the quote, holdings and consents. Below `lg` the panes become a Milestones / Documents switch. |
| `/cases/rc-2026-0132`  | A case blocked by a company query (signature mismatch). Shows the red blocker state.                                                                                                                                                                                                                                                                                                                                     |
| `/cases/rc-2026-0161`  | A legal-heir case that has just started. Shows empty states: no documents, no estimate.                                                                                                                                                                                                                                                                                                                                  |
| `/cases/[id]/evidence` | Evidence room: documents with category, upload date, SHA-256 checksum and extraction status (read, needs checking, reading now, couldn't read); proof-card detail per document via `?doc=`.                                                                                                                                                                                                                              |

Things to try:

- On the home page, pick a holding in the quick-scan bar, type a company and start: the
  check opens at the first question you haven't answered.
- On the review step of the check, use **Edit** or the stepper to change an answer, then
  **Back to review**. Change the holding type and jump forward: the stepper stops at the
  reference step, because the old reference no longer applies.
- Press ⌘K / Ctrl+K anywhere and arrow through cases, actions and fraud reporting. Type
  a detail such as "folio": picking it opens the case on that document, opens the
  Documents pane on a phone and marks the detail.
- On RC-2026-0147, use the document chips above the inspector to read any other document
  in place.
- Approve the three waiting details on RC-2026-0147. The "what happens next" card counts
  down, then hands the next step to the name-change upload. Each review is added to the
  timeline and written to the mock audit log.
- In the triage, choose **I don't remember** for the year. You get an "insufficient
  evidence" result instead of a guess.

## Architecture

```
app/
  layout.tsx                  root: fonts, skip link, metadata
  (marketing)/                public site — layout + landing page
  (app)/                      product — demo banner, app header
    check/                    guided triage
    cases/                    list, [id] overview, [id]/evidence
      [id]/loading.tsx, not-found.tsx
    error.tsx                 error boundary for the product
  not-found.tsx, global-error.tsx
components/
  ui/                         shadcn/ui primitives re-themed, plus VaultCard, StatusBadge, StepBreadcrumb, MetricCounter
  case/                       lifecycle tracker, case panes, status tones, next-step card, tasks, timeline, quote, consents, holdings
  evidence/                   evidence list, detail, proof card, document preview, copy button
  triage/                     triage flow, diagnostic receipt, assessment result
  command/                    ⌘K palette (client) + server index wrapper
  viz/                        route timeline, value waterfall, reading summary, route progress, hash glyph
  motion/                     Framer Motion provider, page transitions, cursor glow, magnetic CTA, count interpolation
  theme/                      theme store + toggle
  brand/                      wordmark, route loader, route illustrations
  marketing/, site/, brand/
lib/
  data.ts                     ← the only door to data: RecoveryDataSource interface + getDataSource()
  mock/adapter.ts             in-memory implementation (resets on restart)
  mock/seed.ts                fictional sample cases
  actions.ts                  server actions; re-validate every input (they are public endpoints)
  rules/triage.ts             versioned, deterministic route rules (iepf-triage-2026.09-r1)
  rules/case-states.ts        the 12 case states, rail logic, labels
  rules/lifecycle.ts          the six display stages over those states (dates from history only)
  triage-prefill.ts           reads ?asset=&issuer=&ref= for the check
  motion/springs.ts, gsap.ts  the Framer Motion spring set; GSAP setup
  types.ts                    domain types, mirroring the SQL schema
  pricing.ts, sources.ts      one source of truth for fee terms and official links
  labels.ts, format.ts        display labels; INR / IST formatting (en-IN, tabular numerals)
supabase/
  migrations/0001_init.sql    Postgres schema, triggers, RLS
  verify/                     local stub for Supabase's auth schema + behaviour checks
scripts/verify-schema.sh
```

**Data flow.** Server components call `getDataSource()` and render. Client components never
touch data directly; they call server actions in `lib/actions.ts`, which re-validate input,
call the same data source, and `revalidatePath` the affected pages. `lib/data.ts` imports
`server-only`, so no adapter can end up in a browser bundle.

**Honesty is structural, not just copy.**

- An extracted field's `value` is `null` when it was not found. The UI says "Not found.
  Left blank, not estimated." The database enforces the same rule (`not_found_means_no_value`,
  `value_has_provenance`).
- The triage never claims a match. Registries without a live connector report
  `not_connected` with `checkedAt: null` ("Last checked: never, not queried"). Only the rules
  engine reports `checked`, with a real timestamp and the rule version.
- Quotes carry an indicative value only with a stated basis (`value_needs_basis` in SQL).
  Unconfirmed amounts are listed as "left out", not guessed.

**Design system.** "The Sovereign Vault": an abyss canvas (`#05080E`) under a soft radial
mesh, acrylic glass panels with a specular rim and a lit top edge, one electric-cyan action
gradient (`#00F2FE` to `#4FACFE`), and four status hues with fixed meanings: emerald
`#10B981` (confirmed, credited), amber `#F59E0B` (in review, waiting on a third party), red
`#EF4444` (blockers, mismatches) and purple `#8B5CF6` (IEPF and regulatory milestones). Text
steps of those hues are tuned so every pair is AA, noted in the CSS. Dark is the default; a
frosted light theme restates the same tokens (toggle in the header, remembered per browser,
restored before first paint). Utilities: `.panel`, `.vault-glass`, `.vault-glass-hover`,
`.vault-card` (cursor glow), `.text-gradient-cyan`, `.bg-brand`, `.font-tabular` (slashed
zeros for IDs, money and dates). Mona Sans Variable is self-hosted from `public/fonts` and preloaded (no late font swap,
no layout shift); Geist Mono comes through `@fontsource-variable`. Icons are Lucide, at one stroke weight.

Charts draw from dedicated fills (`--color-chart-signal`, `--color-chart-credit`,
`--color-chart-muted`), stepped into the categorical lightness band for each theme and checked
with a colour-vision validator (adjacent CVD ΔE 14.1 dark, 15.8 light). Text never wears a
series colour. A semantic layer (`--surface`, `--surface-raised`, `--text-secondary`,
`--success`, `--danger`, `--chart-1..3`, `--gradient-route`, durations and z-index) sits on
top of the ink ladder for new components.

Where the system is written down:

- `MASTER.md`: canonical tokens, motion rules and components.
- `DESIGN.md` and `.impeccable/design.json`: the system as built, in the DESIGN.md format.
- `design/recoveryos.dna.json`: the structured Design DNA (system, style, visual effects).
- `PRODUCT.md`: product truth and principles, including the trust rule (only copy the
  product can fully deliver).

**Motion layer.** Design layer only; no logic, routes or data flow depend on it.

- Landing: GSAP (`lib/motion/gsap.ts`) drives a SplitText line-mask hero reveal, batched
  ScrollTrigger reveals, a scroll-drawn staged route (DrawSVG) and the pricing ledger print.
- The hero's route field (`components/marketing/route-field*.ts(x)`) is vanilla three.js with
  custom shaders, loaded on idle after first paint. The route draws in, then signal pulses
  travel it and wake nearby records, the field swells slowly, a cursor lens lifts records
  on fine pointers, and the credit mark ripples when a pulse arrives. The route glow is a
  second additive point layer, not a post-processing pass. The loop runs only while the
  canvas is on screen and the tab is visible, caps pixel ratio, and falls back to an SVG
  route when WebGL is unavailable, Save-Data is on, or the device is low-end. Reduced
  motion renders one still frame.
- Product screens use Framer Motion springs (`components/motion/motion-provider.tsx`,
  LazyMotion with `strict` and lazily loaded features, `reducedMotion="user"`): the check's
  steps slide and blur in from the side you are heading, shared layout springs move the nav
  rule, tab pills, the ⌘K highlight and the pane switch, and the lifecycle stages open as
  accordions. Hover and press stay in CSS. Figures on the case page count up once with
  `MetricCounter` (the final value is server-rendered and is all a screen reader hears).
- An inline `<head>` script sets `data-motion="on"` only without a reduced-motion preference,
  and a CSS failsafe reveals hidden hero text after 2.4s, so content is never stuck hidden.

**Interface layer.** Also presentation only, built on the same data the pages already read:

- **Command palette** (`components/command/`): ⌘K / Ctrl+K anywhere, or the header Search
  button. Searches pages, sample cases, evidence rooms, documents (by name, reference,
  category or checksum prefix) and the details read from each document (by label only:
  values such as folio numbers or PAN never enter the index, which every page carries).
  Remembers recent picks, orders result groups by their best match, and follows the
  WAI-ARIA combobox pattern. The index (`lib/command-index.ts`) is built on the server
  from the data source; with real data it must be scoped to the signed-in viewer.
- **Visualizations** (`components/viz/`), every one drawn from real case data with its
  numbers also in text: the time-scaled route timeline (Stages / Timeline tabs in the case
  page's lifecycle tracker), the "what reaches you" waterfall in the quote (value, fee, planned protection, net
  before GST), the evidence reading summary (confirmed / waiting / no check needed / not
  found), route progress on the cases list, and each document's checksum drawn as a
  fingerprint mark.
- **Page transitions**: React `<ViewTransition>` with typed navigations. Deeper links slide
  forward, breadcrumbs slide back, the header stays fixed, and case titles carry a shared
  name between list, case and evidence room. Browsers without the API simply swap pages.
- **Signature surfaces**: a fixed radial mesh and grain behind every page, a cursor glow
  on vault cards (fine pointers only), a sheen and a 3px magnetic lean on the main
  CTA, a branded route loader, and route illustrations on 404, error and empty states.

**shadcn/ui.** `components.json` is configured (new-york style, CSS variables, Lucide).
The primitives in `components/ui/` were added by hand in shadcn's current source style,
because the shadcn registry was not reachable from the build environment.
`npx shadcn add <component>` works as normal from here.

## What is mocked vs real

| Area                                                            | In this build                                                                | Real version needs                                                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Case data                                                       | In-memory fictional seed; resets on server restart                           | A Supabase adapter implementing `RecoveryDataSource`                                                                       |
| Sign-in                                                         | None. The viewer is always the sample case's client                          | Supabase Auth with email magic link or passkeys — deliberately not SMS OTP, so "we never ask for an OTP" stays simply true |
| Route rules                                                     | **Real**, deterministic and versioned, but marked `demo`                     | Counsel review, then publish into `rule_versions`                                                                          |
| Registry lookups (IEPF, company lists, UDGAM, EPFO, MF Central) | Not connected. Receipts say "Not queried"                                    | Official APIs or user-driven lookups only. No scraping behind captchas or logins                                           |
| Document upload and storage                                     | Switched off                                                                 | Private Supabase Storage bucket, SHA-256 on arrival, malware scan, short-lived signed URLs                                 |
| Extraction                                                      | Pre-written sample fields                                                    | OCR + model extraction that must emit page + snippet; the schema rejects anything else                                     |
| Approve / correct                                               | **Real** server action with validation; in-memory; writes a mock audit event | `public.review_extracted_field` RPC (already in the migration)                                                             |
| Audit log                                                       | In-memory list                                                               | `audit_events`: append-only, hash-chained (in the migration)                                                               |
| Share prices and values                                         | Fictional sample prices, labelled                                            | Exchange closing price on the credit date, with evidence attached to the invoice                                           |
| Insurance allocation                                            | Shown as a planned, conditional benefit only                                 | A licensed partner; IRDAI-compliant referral model; explicit opt-in                                                        |

## Database

`supabase/migrations/0001_init.sql` creates 17 tables: `users`, `organizations`, `cases`,
`claimants`, `assets`, `evidence_files`, `extracted_fields`, `consents`,
`eligibility_assessments`, `tasks`, `submissions`, `external_events`, `messages`, `quotes`,
`invoices`, `audit_events` and `rule_versions`.

- **Every mutable record** has `created_at`, `updated_at`, `actor_id` and `version`.
  Every **case-scoped** record also has `case_id` (`cases` exposes it as a generated copy of
  its own id). `users`, `organizations` and `rule_versions` are not case-scoped, so they have
  no `case_id`. `audit_events` is append-only, so it has no `updated_at` or `version`.
- A `BEFORE` trigger sets the timestamps and increments `version`. It also resolves
  `actor_id`: the signed-in user, or `set local app.actor_id = '<uuid>'` for trusted server
  writes. A write with no actor fails. Sending a stale `version` raises
  `serialization_failure` (optimistic locking).
- An `AFTER` trigger writes every insert, update and delete to `audit_events`, with a
  SHA-256 hash chain. Updating, deleting or truncating the audit log raises an error, even for
  the table owner.
- **RLS is enabled on every table, deny by default.** `anon` has no grants and no policies.
  `authenticated` gets `SELECT` only, and only on cases the user belongs to (client, case
  lead, or a reviewer or admin in the same organization). There are no insert, update or
  delete policies. All writes go through server code or the one audited RPC,
  `review_extracted_field`, which checks the caller owns the case.
- Published rule versions are immutable. Cases are never hard-deleted: erasure means
  redacting personal data and deleting the storage objects, while the audit trail stays.

**Apply to Supabase (free tier):** create a project, then either paste the file into the SQL
editor, or run `supabase link --project-ref <ref>` followed by `supabase db push`.

**Verify locally without Supabase:** `PG_BIN=/usr/lib/postgresql/16/bin scripts/verify-schema.sh`,
run as a non-root user. It starts a throwaway Postgres and stubs Supabase's `auth` schema and
roles (`supabase/verify/supabase_stub.sql`). It then applies the migration and runs
`supabase/verify/behaviour.sql`, which checks these 25 things:

- actor enforcement
- the honesty constraints
- versioning and optimistic locking
- anon denial
- per-client isolation
- that direct writes are denied
- the RPC's ownership checks
- audit immutability and the hash chain
- that published rules are frozen

The same file can be pointed at a Supabase staging branch, as part of the launch gate.

**Swapping in Supabase:**

1. Add `@supabase/supabase-js` and `@supabase/ssr`.
2. Write `lib/supabase/adapter.ts`, implementing `RecoveryDataSource`. Map snake_case rows to
   the camelCase types in `lib/types.ts`, and call the RPC for `reviewField`.
3. Branch on `RECOVERYOS_DATA_SOURCE=supabase` in `getDataSource()`.

No page or component changes.

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
      adapters in `apps/api/src/common/providers/esign.provider.ts`. Have the Scope of Work reviewed by counsel.
- [ ] **Storage.** Private S3 bucket with SSE-KMS, a malware scan on upload and a retention schedule. Generate keys for
      `FOLIO_*` and `STORAGE_ENCRYPTION_KEY` in a KMS, with a rotation procedure.
- [ ] **Associates.** Write a partner agreement covering the 30% share, verification of professional membership, a payout
      process and TDS.

### Product

- [ ] Real registry connectors only through permitted channels. Otherwise keep "Not queried".
- [ ] Remove fictional sample prices; wire a real valuation source.
- [ ] Screen-reader pass with NVDA, VoiceOver and TalkBack; content in at least one Indian
      language besides English.
- [ ] Remove the demo banner only when everything above is checked.
