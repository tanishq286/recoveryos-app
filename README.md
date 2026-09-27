# RecoveryOS

An AI-first recovery room for unclaimed investments in India. The first wedge is
**IEPF shares and dividends**: shares a company moved to the Investor Education and
Protection Fund after seven years of unclaimed dividends, which the holder (or their heirs)
can claim back on Form IEPF-5.

This repository is the **MVP slice**: the marketing site, a guided triage, a case overview
and an evidence room. They run on a typed mock data layer, and a production Postgres schema
is ready for a Supabase free-tier project.

> **Demo only.** Every case, person, company, folio, checksum and price in this build is
> fictional. Uploads are switched off. Do not put real documents into it. See the
> [launch-gate checklist](#launch-gate-checklist).

---

## Setup

Requirements: Node.js 20.9 or newer, npm.

```bash
npm install
npm run dev        # http://localhost:3000 — no environment variables needed
```

| Script                     | What it does                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | Development server                                                                                        |
| `npm run build`            | Production build (Turbopack), including the TypeScript check                                              |
| `npm start`                | Serve the production build                                                                                |
| `npm run lint`             | ESLint (Next.js core-web-vitals + TypeScript rules)                                                       |
| `npm run typecheck`        | Generate route types, then `tsc --noEmit`                                                                 |
| `npm run format`           | Prettier                                                                                                  |
| `scripts/verify-schema.sh` | Apply the migration to a throwaway local Postgres and run 25 behaviour checks (see [Database](#database)) |

Optional environment variables (none are required):

| Variable                 | Default | Meaning                                                                                     |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------- |
| `RECOVERYOS_DATA_SOURCE` | `mock`  | Which adapter `lib/data.ts` returns. Anything else fails loudly — only `mock` exists today. |
| `MOCK_LATENCY_MS`        | `0`     | Adds delay to every mock call, to see loading states.                                       |

## Screens

| Route                  | What it shows                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                    | Landing page: the promise, how it works (evidence room → recovery engine → trust layer), what we don't do, free official routes beside paid help, pricing, and an anti-fraud notice.                                  |
| `/check`               | Guided triage: one question per screen with a progress rail, then a check-your-answers step. The result gives a route assessment, exact "insufficient evidence" states and a timestamped **sources checked** receipt. |
| `/cases`               | The three sample cases.                                                                                                                                                                                               |
| `/cases/rc-2026-0147`  | Mid-review case: the "what happens next" card, the 12-state evidence-to-credit rail, tasks with named owners and dates, the timeline, proof cards you can approve or correct, the quote card and consents.            |
| `/cases/rc-2026-0132`  | A case blocked by a company query (signature mismatch). Shows the red blocker state.                                                                                                                                  |
| `/cases/rc-2026-0161`  | A legal-heir case that has just started. Shows empty states: no documents, no estimate.                                                                                                                               |
| `/cases/[id]/evidence` | Evidence room: documents with category, upload date, SHA-256 checksum and extraction status (read, needs checking, reading now, couldn't read); proof-card detail per document via `?doc=`.                           |

Things to try:

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
  ui/                         shadcn/ui primitives (new-york style), re-themed
  case/                       status rail, next-step card, tasks, timeline, quote, consents, holdings
  evidence/                   evidence list, detail, proof card, document preview, copy button
  triage/                     triage flow + assessment result
  marketing/, site/, brand/
lib/
  data.ts                     ← the only door to data: RecoveryDataSource interface + getDataSource()
  mock/adapter.ts             in-memory implementation (resets on restart)
  mock/seed.ts                fictional sample cases
  actions.ts                  server actions; re-validate every input (they are public endpoints)
  rules/triage.ts             versioned, deterministic route rules (iepf-triage-2026.09-r1)
  rules/case-states.ts        the 12 case states, rail logic, labels
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

- An extracted field's `value` is `null` when it was not found. The UI says "Not found —
  left blank, not estimated". The database enforces the same rule (`not_found_means_no_value`,
  `value_has_provenance`).
- The triage never claims a match. Registries without a live connector report
  `not_connected` with `checkedAt: null` ("Last checked: never — not queried"). Only the rules
  engine reports `checked`, with a real timestamp and the rule version.
- Quotes carry an indicative value only with a stated basis (`value_needs_basis` in SQL).
  Unconfirmed amounts are listed as "left out", not guessed.

**Design system.** Tokens are in `app/globals.css`: ink `#14232B`, ivory `#F7F5EF`,
pearl `#FFFFFF`, brass `#A58354` (active progress only), teal `#267F77` (confirmed states
only), and red `#B3261E` for real blockers only. Brass and teal fail 4.5:1 as small text on
ivory, so text uses darker variants (`brass-ink` `#7D6238`, `teal-ink` `#1F6B64`); the
contrast of each is noted in the CSS. Fraunces (display) and Inter (body/data) are
self-hosted through `@fontsource-variable`, so the build never fetches fonts from the
network. Dates, amounts, IDs and checksums use tabular numerals.

**shadcn/ui.** `components.json` is configured (new-york style, CSS variables, lucide). The
primitives in `components/ui/` were added by hand in shadcn's current source style, because
the shadcn registry was not reachable from the build environment. `npx shadcn add <component>`
works as normal from here.

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

- **WCAG 2.2 AA.** Focus is visible everywhere: one global 2px ink outline, never removed.
  Other measures:
  - A skip link, one `h1` per page, landmarks, and breadcrumbs with `aria-current`.
  - Status is never shown by colour alone. Every badge has a text label and icon, and the
    rail has visible captions plus screen-reader state text.
  - Form errors link to their fields, are announced, and receive focus. Focus moves to each
    new triage question and to the result.
  - Body text is 16px or larger; `text-sm` (15px) is used only for metadata. Touch targets
    are at least 44px.
  - axe-core (WCAG 2.0/2.1/2.2 A + AA, plus best practice) reports **0 violations** on every
    route at 1280px and at 320px.
- **320px layout.** No horizontal page scroll on any route at 320px (checked in Chromium).
  The rail collapses to a progress bar plus an expandable list, and tables become cards.
- **Motion.** Only milestone transitions animate: the current rail step, the triage step
  change and the result. Each is a single 200–220ms entrance, nothing loops, and skeletons
  do not shimmer. `prefers-reduced-motion` turns animation off.
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

### Product

- [ ] Real registry connectors only through permitted channels. Otherwise keep "Not queried".
- [ ] Remove fictional sample prices; wire a real valuation source.
- [ ] Screen-reader pass with NVDA, VoiceOver and TalkBack; content in at least one Indian
      language besides English.
- [ ] Remove the demo banner only when everything above is checked.
