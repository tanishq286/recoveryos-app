/** Who we are, as every page, PDF, SMS and email names us. */
export const BRAND = {
  name: "Finsol Enterprises",
  shortName: "Finsol",
  domain: "finsolenterprises.com",
  siteUrl: "https://finsolenterprises.com",
  tagline: "Turnkey recovery of unclaimed shares and dividends",
  promise: ["No Upfront Fee", "No Recovery, No Fee", "100% Confidential"],
} as const;

/** Official desks, each on the company domain. */
export const BRAND_EMAILS = {
  claims: "claims@finsolenterprises.com",
  support: "support@finsolenterprises.com",
  info: "info@finsolenterprises.com",
  partners: "partners@finsolenterprises.com",
} as const;

export const BRAND_DESKS = [
  { key: "claims", label: "Claims & Case Desk", email: BRAND_EMAILS.claims },
  { key: "support", label: "Client Support Desk", email: BRAND_EMAILS.support },
  { key: "info", label: "General Inquiries", email: BRAND_EMAILS.info },
  { key: "partners", label: "Partner / Associate Desk", email: BRAND_EMAILS.partners },
] as const;

/** Public pricing: no tiers, no percentages. Staff set each case's fee in the CRM. */
export const PUBLIC_PRICING = {
  headline: "Custom Pricing",
  detail: "Tailored contingency quote after the free trace. ₹0 upfront fee.",
} as const;

/** The only process the public sees: Finsol's turnkey service in four steps. */
export const SERVICE_STEPS = [
  {
    step: 1,
    title: "3-Minute Check",
    body: "Tell us the investor's name and state. We search our records of unclaimed holdings.",
  },
  {
    step: 2,
    title: "Portfolio Verification",
    body: "Our analysts confirm what is held today, after bonuses and splits, and what it is worth.",
  },
  {
    step: 3,
    title: "Complete Paperwork & Legal Execution by Finsol",
    body: "We prepare, file and follow up on everything. You sign once, digitally.",
  },
  {
    step: 4,
    title: "Direct Demat & Bank Credit",
    body: "Shares reach your own demat account and money your own bank account.",
  },
] as const;

/** Which of the four public steps an internal R.E.C.O.V.E.R. step (1-7) belongs to. */
export function serviceStepFor(recoverStep: number): 1 | 2 | 3 | 4 {
  if (recoverStep <= 1) return 1;
  if (recoverStep <= 4) return 2;
  if (recoverStep <= 6) return 3;
  return 4;
}
