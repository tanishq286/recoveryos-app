# Product
<!-- impeccable:product-schema 1 -->

Sources: the owner's MVP brief and redesign brief (2026-09). Facts marked
_(inferred)_ were not stated by the owner and must be confirmed.

## Platform
web

## Users
- Indian retail investors, and the heirs and nominees of investors, whose shares
  or dividends were moved to the Investor Education and Protection Fund (IEPF)
  after seven years unclaimed.
- They hold old paper share certificates, dividend warrants or letters, and are
  wary of recovery fraud. Many read on a phone _(inferred)_.
- Secondary: people with unclaimed mutual funds, PF or bank deposits, who are
  routed to the free official channel (not yet taken as cases).

## Product Purpose
RecoveryOS finds the likely route back to an unclaimed holding, organises the
evidence, prepares the IEPF-5 claim for the client's approval, and shows every
step with a named owner and a date. Success is shares credited to the client's
own demat account, or money to their own bank account.

## Positioning
A recovery room where every detail is traceable to the page it came from, every
source check is receipted (including "not queried"), and every step names who is
holding it. It never guesses a value and never guarantees recovery.

## Operating Context
- First wedge: IEPF shares and dividends (Form IEPF-5, zero government filing
  fee). Company/RTA route for holdings still inside the seven-year window.
- Flow: guided check, consent (DPDP), scope, documents, evidence review, client
  approval, filing, company and IEPF verification, possible query, credit, close.
- Free official self-service routes are always shown beside paid help.

## Capabilities and Constraints
- MVP slice: marketing site, guided triage, case overview, evidence room, on a
  typed mock data layer with fictional sample cases. Uploads are switched off.
- Stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui. No paid services.
- Pricing (draft, counsel review pending): 10% success fee on value actually
  credited, nothing upfront. A further 10% protection allocation toward a
  life/health policy is PLANNED and conditional (licensed partner availability,
  the client's choice, policy issuance); never presented as guaranteed cover.

## Brand Commitments
- Name: RecoveryOS. Keep the existing mark geometry.
- Its own identity, distinct from the owner's other products: calm, precise,
  clinical-tech; deep ink/charcoal base with a cool accent (teal/electric blue
  family); no warm cream or yellow tones; premium and minimal, with richness from
  motion and craft rather than visual density.
- Red only for real blockers.

## Evidence on Hand
- No customers, testimonials, press, benchmarks or recovery statistics exist.
  None may be fabricated or implied. All sample cases are fictional and labelled.
- Real, verifiable facts that may be cited: Companies Act 2013 s.124(6) seven-year
  rule; IEPF-5 has no government filing fee; official portals (iepf.gov.in,
  mca.gov.in, scores.sebi.gov.in, udgam.rbi.org.in, EPFO, MF Central); the 1930
  cyber crime helpline.

## Product Principles
1. Only copy we can fully deliver: no fake proof, inflated numbers or testimonials.
2. Never invent a value: gaps are shown as gaps, with the reason.
3. Every step has a named owner and a date.
4. The free route is always visible beside the paid one.
5. Never ask for OTPs, passwords, PINs or demat logins.

## Accessibility & Inclusion
WCAG 2.2 AA; visible focus; full keyboard use; body text at least 16px; status
never shown by colour alone; 320px layouts; reduced-motion support; phone
performance (transform/opacity animation only, no layout thrash).
