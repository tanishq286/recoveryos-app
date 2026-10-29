/**
 * The eleven service verticals. `status` keeps the trust rule from PRODUCT.md:
 * only "taking-cases" verticals run as paid cases today; the rest explain the
 * free official route and take a call-back request, nothing more.
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
  /** What the work involves, in order. */
  steps: string[];
  /** The documents people usually need. */
  documents: string[];
  /** The free official route, always shown beside paid help. */
  officialRoute: { label: string; href: string; note: string } | null;
  /** Honest limits of what we do. */
  limits: string[];
}

export const SERVICE_VERTICALS: ServiceVertical[] = [
  {
    slug: "iepf-claim",
    name: "IEPF claim",
    summary: "Recover shares and dividends moved to the IEPF Authority, through Form IEPF-5.",
    status: "taking-cases",
    forWhom:
      "Holders and heirs whose shares moved to the IEPF after seven years of unclaimed dividends.",
    steps: [
      "Confirm the holding with the company's registrar (entitlement letter).",
      "Prepare Form IEPF-5, the indemnity bond and the advance receipt.",
      "File on the MCA portal and send the signed pack to the company's nodal officer.",
      "Track company verification and the IEPF Authority's decision until credit.",
    ],
    documents: [
      "PAN",
      "Aadhaar",
      "Client master list",
      "Cancelled cheque",
      "Certificates or FIR",
      "Indemnity bond",
    ],
    officialRoute: {
      label: "File IEPF-5 yourself on the MCA portal",
      href: "https://www.mca.gov.in",
      note: "There is no government filing fee for IEPF-5.",
    },
    limits: ["The IEPF Authority decides every claim. Nobody can guarantee or speed up approval."],
  },
  {
    slug: "duplicate-shares",
    name: "Duplicate shares and letter of confirmation",
    summary:
      "Lost or damaged certificates replaced with a letter of confirmation, then dematerialised.",
    status: "taking-cases",
    forWhom:
      "Holders whose shares are still with the company but whose certificates are lost, torn or stolen.",
    steps: [
      "Lodge an FIR or police report for the lost certificates.",
      "Apply to the registrar with Form ISR-4 and an indemnity.",
      "Receive the letter of confirmation and lodge it with your depository participant within 120 days.",
    ],
    documents: ["FIR", "Form ISR-4", "Indemnity bond", "PAN", "Client master list"],
    officialRoute: null,
    limits: ["Companies may ask for a newspaper advertisement, whose cost is yours."],
  },
  {
    slug: "transmission-of-shares",
    name: "Transmission of shares",
    summary: "Shares of a holder who has died moved to the nominee or legal heirs.",
    status: "taking-cases",
    forWhom: "Nominees, surviving joint holders and legal heirs.",
    steps: [
      "Work out which document proves succession for this holding's value.",
      "Prepare Form ISR-5, affidavits and indemnities for the registrar.",
      "If the shares already moved to the IEPF, claim them on IEPF-5 as heirs.",
    ],
    documents: [
      "Death certificate",
      "Succession or legal heir certificate",
      "No-objection from other heirs",
      "Claimant KYC",
    ],
    officialRoute: null,
    limits: ["Disputes between heirs need a lawyer and a court; we stop until they are settled."],
  },
  {
    slug: "physical-to-demat",
    name: "Physical to demat (DRF)",
    summary: "Old paper certificates converted into shares in your demat account.",
    status: "taking-cases",
    forWhom: "Holders with valid physical certificates in their own name.",
    steps: [
      "Update KYC with the registrar (Forms ISR-1 and ISR-2).",
      "Submit the demat request form and certificates through your depository participant.",
      "Track the registrar's confirmation until the shares appear in your account.",
    ],
    documents: [
      "Original certificates",
      "Demat request form",
      "ISR-1 and ISR-2",
      "Client master list",
    ],
    officialRoute: null,
    limits: ["Signature mismatches need a banker's attestation before the registrar will act."],
  },
  {
    slug: "unclaimed-mutual-funds",
    name: "Unclaimed mutual funds",
    summary:
      "Forgotten folios and unclaimed redemptions or dividends, including amounts in the SCWF.",
    status: "call-back",
    forWhom: "Investors and heirs with old mutual fund folios.",
    steps: [
      "Find folios on MF Central.",
      "Update KYC and bank details with the registrar.",
      "Claim the unclaimed amount from the fund house.",
    ],
    documents: ["PAN", "KYC", "Bank proof"],
    officialRoute: {
      label: "Find folios on MF Central",
      href: "https://www.mfcentral.com",
      note: "Free, run by CAMS and KFintech.",
    },
    limits: [
      "We are not taking paid mutual fund cases yet. We will call you back with the free route.",
    ],
  },
  {
    slug: "inoperative-bank-deposits",
    name: "Inoperative bank deposits (DEAF)",
    summary:
      "Deposits unclaimed for ten years and moved to the RBI's DEAF, reclaimed from the bank.",
    status: "call-back",
    forWhom: "Depositors and heirs of dormant accounts and fixed deposits.",
    steps: [
      "Search several banks on RBI UDGAM.",
      "Apply to the bank's branch with KYC.",
      "The bank pays and reclaims from DEAF.",
    ],
    documents: [
      "KYC",
      "Passbook or deposit receipt if any",
      "Heirs' documents if the depositor died",
    ],
    officialRoute: {
      label: "Search on RBI UDGAM",
      href: "https://udgam.rbi.org.in",
      note: "Free. Searches several banks at once.",
    },
    limits: ["Banks pay you directly; no one needs to be paid to release a DEAF deposit."],
  },
  {
    slug: "unclaimed-epf",
    name: "Unclaimed EPF",
    summary: "Provident fund balances in old or inoperative accounts transferred or withdrawn.",
    status: "call-back",
    forWhom: "Employees and heirs with PF in past employers' accounts.",
    steps: [
      "Activate your UAN.",
      "Merge or transfer old member IDs.",
      "Claim online from the member portal.",
    ],
    documents: ["UAN", "Aadhaar linked to UAN", "Bank details"],
    officialRoute: {
      label: "EPFO member portal",
      href: "https://unifiedportal-mem.epfindia.gov.in",
      note: "Free. Needs your own UAN login.",
    },
    limits: ["We will never ask for your EPFO password or OTP."],
  },
  {
    slug: "unclaimed-insurance",
    name: "Unclaimed insurance",
    summary: "Maturity and death claims left with insurers after policies lapsed from view.",
    status: "call-back",
    forWhom: "Policyholders and nominees.",
    steps: [
      "Search each insurer's unclaimed amounts page.",
      "Submit the claim form with KYC.",
      "Escalate to the insurer's grievance cell or Bima Bharosa if it stalls.",
    ],
    documents: ["Policy number or bond", "KYC", "Death certificate for death claims"],
    officialRoute: {
      label: "IRDAI Bima Bharosa grievances",
      href: "https://bimabharosa.irdai.gov.in",
      note: "Free complaints against insurers.",
    },
    limits: ["We are not taking paid insurance cases yet."],
  },
  {
    slug: "debtor-recovery",
    name: "Debtor recovery",
    summary: "Help with legal notices and recovery routes for money owed to you.",
    status: "call-back",
    forWhom: "Individuals and small businesses owed money.",
    steps: [
      "Review the paper trail.",
      "Introduce a panel advocate for a legal notice.",
      "Discuss mediation or suit options with them.",
    ],
    documents: ["Invoices or agreements", "Correspondence"],
    officialRoute: null,
    limits: ["Legal advice comes only from a licensed advocate, never from us."],
  },
  {
    slug: "litigation-funding",
    name: "Litigation funding",
    summary: "Introductions to funders for strong recovery claims that need legal costs covered.",
    status: "call-back",
    forWhom: "Claimants with documented, high-value disputes.",
    steps: [
      "Screen the claim with a panel advocate.",
      "Introduce funders who may assess it.",
      "The funder and claimant agree terms directly.",
    ],
    documents: ["Case summary", "Key documents"],
    officialRoute: null,
    limits: ["We do not fund cases ourselves and make no promise a funder will."],
  },
  {
    slug: "nri-samadhan",
    name: "NRI Samadhan",
    summary:
      "IEPF and share recovery for holders living abroad, with remote signing and apostille help.",
    status: "taking-cases",
    forWhom: "Non-resident holders and heirs, and Indians whose papers are with family abroad.",
    steps: [
      "Check the holder's residency status and the demat account they need (NRO or NRE).",
      "Arrange notarisation or apostille for documents signed abroad.",
      "File IEPF-5 or the registrar route and track it from here.",
    ],
    documents: [
      "Passport",
      "Overseas address proof",
      "PAN",
      "NRO/NRE demat CML",
      "Apostilled indemnity bond",
    ],
    officialRoute: {
      label: "MCA portal for IEPF-5",
      href: "https://www.mca.gov.in",
      note: "No government filing fee.",
    },
    limits: ["Repatriation of proceeds follows FEMA rules and your bank's process."],
  },
];

export function serviceBySlug(slug: string): ServiceVertical | undefined {
  return SERVICE_VERTICALS.find((s) => s.slug === slug);
}
