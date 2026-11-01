/**
 * The eleven service verticals, as the public sees them. Each describes the
 * outcome and what Finsol Enterprises handles; the filing mechanics stay
 * with our staff. "taking-cases" verticals run as cases today; the rest take
 * a call-back request.
 */
export type ServiceStatus = "taking-cases" | "call-back";

export interface ServiceVertical {
  slug: string;
  name: string;
  /** One line for cards and meta descriptions. */
  summary: string;
  status: ServiceStatus;
  /** Who this is for. */
  forWhom: string;
  /** What Finsol takes off the client's hands, in plain outcomes. */
  weHandle: string[];
  /** What the client may be asked to share once the case starts. */
  youShare: string[];
  /** Honest limits of what we do. */
  limits: string[];
}

const KYC_SHARE = ["PAN", "Aadhaar", "Bank account proof", "Demat account details"];

export const SERVICE_VERTICALS: ServiceVertical[] = [
  {
    slug: "iepf-claim",
    name: "IEPF share recovery",
    summary: "Shares and dividends moved to the IEPF Authority, recovered end to end by Finsol.",
    status: "taking-cases",
    forWhom:
      "Holders and families whose shares moved to the IEPF after seven years of unclaimed dividends.",
    weHandle: [
      "Confirming exactly what is held today, after every bonus and split.",
      "All paperwork, legal execution and filings.",
      "Every follow-up with the company until the claim is approved.",
      "Tracking until shares reach your demat account and money your bank.",
    ],
    youShare: KYC_SHARE,
    limits: ["Approval rests with the authorities. Nobody can honestly guarantee or speed it up."],
  },
  {
    slug: "duplicate-shares",
    name: "Lost or damaged share certificates",
    summary: "Lost, torn or stolen certificates replaced, then moved into your demat account.",
    status: "taking-cases",
    forWhom: "Holders whose shares are still with the company but whose certificates are missing.",
    weHandle: [
      "Every application, affidavit and indemnity the company needs.",
      "Coordination with the company until replacement is issued.",
      "Conversion into your demat account.",
    ],
    youShare: [...KYC_SHARE, "Any old certificate copies or letters"],
    limits: ["Some companies require a newspaper notice, whose cost is passed on at actuals."],
  },
  {
    slug: "transmission-of-shares",
    name: "Transmission to heirs",
    summary: "Shares of a holder who has died moved to the nominee or legal heirs.",
    status: "taking-cases",
    forWhom: "Nominees, surviving joint holders and legal heirs.",
    weHandle: [
      "Working out which succession document this holding needs.",
      "Every affidavit, indemnity and application.",
      "Recovery from the IEPF as well, if the shares already moved there.",
    ],
    youShare: ["Death certificate", "Details of the heirs", ...KYC_SHARE],
    limits: ["Disputes between heirs need a court; we pause until they are settled."],
  },
  {
    slug: "physical-to-demat",
    name: "Physical to demat",
    summary: "Old paper certificates converted into shares in your demat account.",
    status: "taking-cases",
    forWhom: "Holders with valid physical certificates in their own name.",
    weHandle: [
      "KYC and signature updates with the company.",
      "The conversion request and its follow-up.",
      "Tracking until the shares appear in your account.",
    ],
    youShare: ["Original certificates", ...KYC_SHARE],
    limits: ["Signature mismatches need a banker's attestation, which we arrange with you."],
  },
  {
    slug: "unclaimed-mutual-funds",
    name: "Unclaimed mutual funds",
    summary: "Forgotten folios and unclaimed redemptions or dividends.",
    status: "call-back",
    forWhom: "Investors and families with old mutual fund folios.",
    weHandle: ["Tracing old folios.", "KYC and bank updates.", "The claim itself."],
    youShare: ["PAN", "Bank account proof"],
    limits: ["We take a call-back request and confirm whether we can act before anything starts."],
  },
  {
    slug: "inoperative-bank-deposits",
    name: "Inoperative bank deposits",
    summary: "Deposits unclaimed for ten years, reclaimed from the bank.",
    status: "call-back",
    forWhom: "Depositors and families of dormant accounts and fixed deposits.",
    weHandle: ["Tracing the deposit.", "The bank's claim process.", "Follow-up until payment."],
    youShare: ["KYC", "Any passbook or deposit receipt"],
    limits: ["Banks pay you directly; we never handle your money."],
  },
  {
    slug: "unclaimed-epf",
    name: "Unclaimed provident fund",
    summary: "Provident fund in old or inoperative accounts, transferred or withdrawn.",
    status: "call-back",
    forWhom: "Employees and families with PF in past employers' accounts.",
    weHandle: ["Tracing old member accounts.", "Transfer or withdrawal paperwork."],
    youShare: ["UAN if known", "Bank account proof"],
    limits: ["We never ask for your EPFO password or any one-time code."],
  },
  {
    slug: "unclaimed-insurance",
    name: "Unclaimed insurance",
    summary: "Maturity and death claims left with insurers.",
    status: "call-back",
    forWhom: "Policyholders and nominees.",
    weHandle: ["Tracing the policy.", "The claim and any escalation."],
    youShare: ["Policy details if known", "KYC"],
    limits: ["We take a call-back request and confirm whether we can act before anything starts."],
  },
  {
    slug: "debtor-recovery",
    name: "Debtor recovery",
    summary: "Legal notices and recovery routes for money owed to you.",
    status: "call-back",
    forWhom: "Individuals and small businesses owed money.",
    weHandle: ["Reviewing the paper trail.", "Introducing a panel advocate."],
    youShare: ["Invoices or agreements", "Correspondence"],
    limits: ["Legal advice comes only from a licensed advocate."],
  },
  {
    slug: "litigation-funding",
    name: "Litigation funding",
    summary: "Introductions to funders for strong recovery claims that need legal costs covered.",
    status: "call-back",
    forWhom: "Claimants with documented, high-value disputes.",
    weHandle: ["Screening with a panel advocate.", "Introductions to funders."],
    youShare: ["Case summary", "Key documents"],
    limits: ["We do not fund cases ourselves and make no promise a funder will."],
  },
  {
    slug: "nri-samadhan",
    name: "NRI share recovery",
    summary: "Share and IEPF recovery for holders living abroad, signed remotely.",
    status: "taking-cases",
    forWhom: "Non-resident holders and families, and Indians whose papers are with family abroad.",
    weHandle: [
      "The right demat account for your residency status.",
      "Notarisation and apostille for documents signed abroad.",
      "The full recovery, tracked from your client room.",
    ],
    youShare: ["Passport", "Overseas address proof", "PAN", "NRO/NRE demat details"],
    limits: ["Repatriation of proceeds follows FEMA rules and your bank's process."],
  },
];

export function serviceBySlug(slug: string): ServiceVertical | undefined {
  return SERVICE_VERTICALS.find((s) => s.slug === slug);
}
