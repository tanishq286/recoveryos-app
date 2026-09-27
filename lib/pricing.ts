/**
 * Pricing terms — one source of truth for the landing page and every quote.
 * Draft terms: must pass counsel review before launch (see README launch gates).
 */

export const SUCCESS_FEE_BPS = 1000; // 10% of value actually credited
export const PROTECTION_ALLOCATION_BPS = 1000; // 10% toward insurance, planned + conditional

export const VALUATION_RULE =
  "Value is fixed on the day of credit: shares credited × that day's closing price on NSE (or BSE if the company is not listed on NSE), plus any dividend amount actually credited to you.";

export const SUCCESS_FEE_CONDITIONS = [
  "Nothing is payable upfront. Our fee is due only after shares or money are actually credited to you.",
  "If nothing is credited, you owe us nothing.",
  "GST applies to our fee as per law.",
  "You can stop before filing at no charge.",
];

export const PROTECTION_CONDITION =
  "Planned benefit: a further 10% of the recovery set aside toward a life or health insurance policy in your name — subject to licensed partner availability, your choice and policy issuance. We do not sell insurance; any policy would come from an IRDAI-licensed insurer through a licensed intermediary. If you opt out, or no policy is issued, this 10% stays with you.";

export const PROTECTION_STATUS_NOTE =
  "Planned, not yet active. Nothing is set aside for it until a licensed partner is in place and you say yes.";
