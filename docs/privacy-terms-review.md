# Privacy notice and terms: items for owner review

`/privacy` and `/terms` describe only what the application does today. Before
they are treated as final, the owner should confirm or supply the following.
Nothing below has been invented on the site.

## Must be supplied by the owner
- The legal entity behind Finsol Enterprises (registered name, form of entity,
  registered address). The site currently names only the brand.
- A grievance or data-protection contact for the Digital Personal Data
  Protection Act, 2023, if one is designated. The site points to
  support@finsolenterprises.com.
- Retention periods for accounts, cases, uploaded documents, audit records and
  calculator reports. The site says records are kept while a case is open and
  as long as legal and accounting obligations require.
- Whether account deletion requests are handled manually (no self-service
  deletion exists in the product).
- The SMS and eSign providers once contracted (MSG91/Twilio, Digio/Leegality),
  so they can be named.

## Facts the pages rely on (verified in code on 2026-11-01)
- Sign-in collects name, mobile and email; OTPs are stored as HMAC hashes with
  a five-minute expiry (`apps/api/src/modules/auth/otp.service.ts`).
- Request IPs are stored on OTP challenges and audit events.
- Member searches write an audit event with state, match count and a joint
  flag, not the name (`search.service.ts`).
- Uploaded documents are encrypted (AES-256-GCM) before storage
  (`storage.provider.ts`).
- Hosting: Vercel (web `finsolenterprises`, API `finsolenterprises-api`,
  function region sin1). Database: Neon, ap-southeast-1.
- Market prices come from Yahoo Finance's public endpoints; no personal data
  is sent.

## Wording changed in this review
- "100% Confidential" became "Confidential Handling", because documents are
  necessarily shared with the company, its registrar, the IEPF Authority and
  the service providers that run the site.
