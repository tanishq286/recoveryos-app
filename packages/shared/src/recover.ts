import type { DocType, PhysicalCertStatus, Role, ScenarioType } from "./enums.js";

/**
 * R.E.C.O.V.E.R.: the seven steps every case moves through. Steps only move
 * forward through `advanceRecoverStep`, and step 6 needs a signed mandate.
 */
export const RECOVER_STEPS = [
  {
    step: 1,
    key: "1_RING_UP",
    letter: "R",
    name: "Ring up",
    summary: "We call you, confirm who you are and what you hold.",
    owner: "VALUATION_ANALYST",
  },
  {
    step: 2,
    key: "2_EVALUATE",
    letter: "E",
    name: "Evaluate",
    summary: "Shares after bonuses and splits, dividends, and today's value.",
    owner: "VALUATION_ANALYST",
  },
  {
    step: 3,
    key: "3_CHECK",
    letter: "C",
    name: "Check",
    summary: "Feasibility: the route, the papers you have and what is missing.",
    owner: "LEGAL_OPS_EXEC",
  },
  {
    step: 4,
    key: "4_OFFER",
    letter: "O",
    name: "Offer",
    summary: "A written scope of work and fee, nothing payable upfront.",
    owner: "VALUATION_ANALYST",
  },
  {
    step: 5,
    key: "5_VERIFY_ESIGN",
    letter: "V",
    name: "Verify",
    summary: "You sign the mandate with Aadhaar eSign and share your KYC.",
    owner: "INVESTOR",
  },
  {
    step: 6,
    key: "6_EMPLOY_IEPF5_RTA",
    letter: "E",
    name: "Employ",
    summary: "IEPF-5 is filed, the registrar and nodal officer verify it.",
    owner: "LEGAL_OPS_EXEC",
  },
  {
    step: 7,
    key: "7_REALIZE_DEMAT",
    letter: "R",
    name: "Realize",
    summary: "Shares reach your own demat account, dividends your bank.",
    owner: "LEGAL_OPS_EXEC",
  },
] as const satisfies readonly {
  step: number;
  key: string;
  letter: string;
  name: string;
  summary: string;
  owner: Role;
}[];

export type RecoverStepNumber = (typeof RECOVER_STEPS)[number]["step"];
export type RecoverStepKey = (typeof RECOVER_STEPS)[number]["key"];

export function recoverStep(step: number) {
  const found = RECOVER_STEPS.find((s) => s.step === step);
  if (!found) throw new RangeError(`R.E.C.O.V.E.R. step must be 1 to 7, got ${step}`);
  return found;
}

export interface AdvanceCheck {
  ok: boolean;
  reason?: string;
}

/** Whether a case may move from `current` to `next`. */
export function canAdvanceRecoverStep(
  current: number,
  next: number,
  ctx: { esignSigned: boolean; srnFiled: boolean },
): AdvanceCheck {
  if (next < 1 || next > 7) return { ok: false, reason: "Step must be between 1 and 7." };
  if (next <= current) return { ok: false, reason: "Cases only move forward." };
  if (next > current + 1) return { ok: false, reason: "Steps cannot be skipped." };
  if (next >= 6 && !ctx.esignSigned)
    return { ok: false, reason: "The client must sign the mandate (step 5) before filing." };
  if (next === 7 && !ctx.srnFiled)
    return { ok: false, reason: "Record the IEPF-5 SRN before moving to credit." };
  return { ok: true };
}

/* ── Scenario rules: checklist and timeline ─────────────────────────────── */

export interface ChecklistItem {
  docType: DocType;
  /** Why this document is needed, in plain words. */
  reason: string;
  /** Needed before filing; otherwise it arrives later (the SRN acknowledgement). */
  beforeFiling: boolean;
}

export interface ChecklistInput {
  scenario: ScenarioType;
  certStatus?: PhysicalCertStatus;
}

const KYC: ChecklistItem[] = [
  { docType: "PAN", reason: "Identity and tax record of the claimant.", beforeFiling: true },
  {
    docType: "AADHAAR",
    reason: "Address proof and the Aadhaar eSign of the mandate.",
    beforeFiling: true,
  },
  {
    docType: "CML_COPY",
    reason: "Shares can only be credited to a demat account in the claimant's own name.",
    beforeFiling: true,
  },
  {
    docType: "CANCELLED_CHEQUE",
    reason: "Dividends are refunded only to the claimant's own bank account.",
    beforeFiling: true,
  },
  {
    docType: "ISR1_ISR2_KYC",
    reason: "SEBI's KYC forms for physical holders, with a banker-attested signature.",
    beforeFiling: true,
  },
];

/** The documents a case needs, by scenario and by what happened to the certificates. */
export function documentChecklist({
  scenario,
  certStatus = "AVAILABLE",
}: ChecklistInput): ChecklistItem[] {
  const items = [...KYC];
  const certReason =
    certStatus === "AVAILABLE"
      ? "The original certificates, surrendered to the company."
      : certStatus === "PARTIAL"
        ? "The certificates you have, and an FIR or police report for the missing ones."
        : "An FIR or police report for the lost certificates.";
  const add = (docType: DocType, reason: string, beforeFiling = true) =>
    items.push({ docType, reason, beforeFiling });

  switch (scenario) {
    case "STANDARD_IEPF5":
      add("ORIGINAL_CERT_OR_FIR", certReason);
      add("INDEMNITY_BOND", "Required by IEPF-5 on non-judicial stamp paper.");
      add("IEPF5_ACKNOWLEDGEMENT", "Generated once the e-form is filed; we track its SRN.", false);
      break;
    case "DUPLICATE_LOC":
      add("ORIGINAL_CERT_OR_FIR", certReason);
      add("INDEMNITY_BOND", "The company issues a letter of confirmation against an indemnity.");
      break;
    case "DECEASED_TRANSMISSION":
      add("DEATH_CERTIFICATE", "Proof of the holder's death.");
      add(
        "LEGAL_HEIR_OR_SUCCESSION_CERT",
        "Who inherits: a succession certificate, probate or legal heir certificate.",
      );
      add("ORIGINAL_CERT_OR_FIR", certReason);
      add("INDEMNITY_BOND", "Required for transmission and for IEPF-5 claims by heirs.");
      add("IEPF5_ACKNOWLEDGEMENT", "Needed if the shares already moved to the IEPF.", false);
      break;
    case "NRI_RECOVERY":
      add("ORIGINAL_CERT_OR_FIR", certReason);
      add(
        "INDEMNITY_BOND",
        "Signed abroad, notarised or apostilled, and stamped in India before filing.",
      );
      add("IEPF5_ACKNOWLEDGEMENT", "Generated once the e-form is filed; we track its SRN.", false);
      break;
    case "DEMAT_DRF":
      add("ORIGINAL_CERT_OR_FIR", "The original certificates, sent with the demat request form.");
      break;
  }
  return items;
}

/** Indicative months from signed mandate to credit, by scenario. Never a promise. */
export const SCENARIO_TIMELINE_MONTHS: Record<ScenarioType, [number, number]> = {
  STANDARD_IEPF5: [6, 12],
  DUPLICATE_LOC: [2, 4],
  DECEASED_TRANSMISSION: [6, 14],
  NRI_RECOVERY: [8, 15],
  DEMAT_DRF: [1, 2],
};

/** The calculator's four situations, mapped to case scenarios. */
export const CALCULATOR_SITUATIONS = [
  {
    key: "ALIVE_WITH_CERTS",
    label: "Holder alive, certificates in hand",
    scenario: "STANDARD_IEPF5",
    certStatus: "AVAILABLE",
  },
  { key: "LOST_CERTS", label: "Certificates lost", scenario: "DUPLICATE_LOC", certStatus: "LOST" },
  {
    key: "DECEASED",
    label: "Holder has passed away",
    scenario: "DECEASED_TRANSMISSION",
    certStatus: "AVAILABLE",
  },
  {
    key: "NRI",
    label: "Holder lives outside India",
    scenario: "NRI_RECOVERY",
    certStatus: "AVAILABLE",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  scenario: ScenarioType;
  certStatus: PhysicalCertStatus;
}[];

export type CalculatorSituation = (typeof CALCULATOR_SITUATIONS)[number]["key"];
