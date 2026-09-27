import type {
  AssetType,
  EligibilityAssessment,
  IdentifierKind,
  MissingEvidence,
  RouteKind,
  SelfServiceLink,
  TriageInput,
} from "@/lib/types";
import { ROUTE_LABELS } from "@/lib/rules/case-states";
import { OFFICIAL_LINKS } from "@/lib/sources";

/**
 * Versioned, deterministic route rules. Same input + same version = same
 * answer, and the version is printed on every receipt. Rule changes ship as a
 * new version (see `rule_versions` in the migration), never as an edit.
 *
 * These rules only choose a *route*. They never assert that a holding exists.
 */
export const TRIAGE_RULE_VERSION = {
  id: "iepf-triage-2026.09-r1",
  label: "IEPF triage rules 2026.09 r1",
  effectiveFrom: "2026-09-01",
  status: "demo" as const,
};

/** Companies Act 2013, s.124(6): 7 consecutive unclaimed years → shares move to IEPF. */
export const IEPF_UNCLAIMED_YEARS = 7;

export const ASSET_LABELS: Record<AssetType, string> = {
  iepf_shares_dividends: "Shares or dividends (IEPF)",
  mutual_funds: "Mutual funds",
  provident_fund: "Provident fund (PF)",
  bank_deposits: "Bank deposits",
};

export const IDENTIFIER_LABELS: Record<IdentifierKind, string> = {
  folio: "Folio number",
  dp_client: "Demat DP ID + Client ID",
  uan: "UAN",
  account_last4: "Last 4 digits of the account number",
};

const IDENTIFIER_PATTERNS: Record<IdentifierKind, { re: RegExp; hint: string }> = {
  folio: { re: /^[A-Z0-9/-]{3,20}$/i, hint: "3–20 letters, numbers, / or -" },
  dp_client: {
    re: /^(IN\d{14}|\d{16})$/i,
    hint: "16 characters: IN + 14 digits (NSDL) or 16 digits (CDSL)",
  },
  uan: { re: /^\d{12}$/, hint: "12 digits" },
  account_last4: { re: /^\d{4}$/, hint: "exactly 4 digits" },
};

export function currentYearIST(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" }).format(now),
  );
}

export function validateIdentifier(kind: IdentifierKind, raw: string): string | null {
  const value = raw.replace(/\s+/g, "").toUpperCase();
  const rule = IDENTIFIER_PATTERNS[kind];
  return rule.re.test(value) ? null : rule.hint;
}

export type RouteDecision = Omit<EligibilityAssessment, "id" | "assessedAt" | "sources">;

export function decideRoute(input: TriageInput, now: Date): RouteDecision {
  const year = currentYearIST(now);
  const missing: MissingEvidence[] = [];
  const inputNotes: string[] = [];
  const reasons: string[] = [];
  const nextSteps: string[] = [];

  const issuer = input.issuerName?.trim() || null;

  // --- validate what we were given; drop anything we can't read rather than guess
  let lastYear = input.lastActivityYear;
  if (lastYear !== null && (lastYear < 1950 || lastYear > year)) {
    inputNotes.push(
      `The year you gave is outside 1950–${year}, so we have left it out of this check.`,
    );
    lastYear = null;
  }

  if (input.identifierKind && input.identifier) {
    const problem = validateIdentifier(input.identifierKind, input.identifier);
    const label = IDENTIFIER_LABELS[input.identifierKind];
    if (problem) {
      inputNotes.push(
        `We couldn't read what you entered as a ${label} (expected ${problem}), so we have left it out. Nothing else was affected.`,
      );
    } else {
      inputNotes.push(
        `${label} noted. It is used only to tell you where to look and is not stored in this demo.`,
      );
    }
  }

  const base = {
    ruleVersion: TRIAGE_RULE_VERSION,
    selfService: selfServiceFor(input.assetType),
    inScope: input.assetType === "iepf_shares_dividends",
  };

  // --- heirs always go to a person first, for every asset type
  if (input.holderType === "heir") {
    reasons.push(
      "You are claiming as a legal heir. The holding has to be transmitted to you first, and the documents needed depend on the value, whether there is a will, and what the company, registrar or institution asks for.",
      "A person on our team reviews every heir case before suggesting a route. We will not guess.",
    );
    if (input.assetType === "iepf_shares_dividends" && lastYear !== null) {
      const gap = year - lastYear;
      if (gap > IEPF_UNCLAIMED_YEARS) {
        reasons.push(
          `Separately: the last dividend was about ${gap} years ago, so the shares may already be with IEPF. That changes where the claim is sent, not the need for transmission documents.`,
        );
      }
    }
    nextSteps.push(
      "Keep the death certificate ready, along with any will, succession certificate or legal heir certificate you already have.",
      "Note the holder's name exactly as it appears on the certificate, statement or passbook.",
    );
    if (!issuer) missing.push(issuerMissing(input.assetType));
    return {
      ...base,
      route: "manual_review",
      routeLabel: ROUTE_LABELS.manual_review,
      confidence: "possible",
      headline: "Needs manual review before any filing",
      reasons,
      missing,
      inputNotes,
      nextSteps,
    };
  }

  // --- non-IEPF assets: point to the free official route
  if (input.assetType !== "iepf_shares_dividends") {
    return {
      ...base,
      ...institutionRoute(input.assetType, issuer, missing),
      inputNotes,
    };
  }

  // --- IEPF shares and dividends
  if (!issuer) missing.push(issuerMissing(input.assetType));

  let route: RouteKind;
  let confidence: EligibilityAssessment["confidence"];
  let headline: string;

  if (lastYear === null) {
    route = "insufficient_evidence";
    confidence = "undetermined";
    headline = "Not enough information to choose a route yet";
    missing.unshift({
      field: "Year of the last dividend",
      why: `Shares move to IEPF only after dividends stay unclaimed for ${IEPF_UNCLAIMED_YEARS} consecutive years. Without a rough year we cannot tell whether to look at the company's own unclaimed list or at IEPF, so we have not picked one.`,
    });
    reasons.push(
      'Both routes are still open. A rough year — even "early 2000s" — is enough to narrow it down. Old bank passbooks often show dividend credits.',
    );
  } else {
    const gap = year - lastYear;
    reasons.push(
      `You last received a dividend around ${lastYear} — about ${gap} year${gap === 1 ? "" : "s"} ago.`,
    );
    if (gap > IEPF_UNCLAIMED_YEARS) {
      route = "iepf";
      confidence = "likely";
      headline = "Likely IEPF route";
      reasons.push(
        `Under Section 124(6) of the Companies Act, 2013, shares whose dividends stay unclaimed for ${IEPF_UNCLAIMED_YEARS} consecutive years are transferred to the IEPF, along with the unclaimed dividends. That window has passed.`,
        "IEPF claims are made on Form IEPF-5. There is no government filing fee.",
      );
    } else if (gap >= IEPF_UNCLAIMED_YEARS - 1) {
      route = "iepf";
      confidence = "possible";
      headline = "Possibly IEPF — close to the seven-year line";
      reasons.push(
        "Whether the shares have moved depends on the exact dividend dates, so they may still be with the company. Both the company's list and the IEPF list should be checked.",
      );
    } else {
      route = "company_rta";
      confidence = "likely";
      headline = "Likely company / RTA route";
      reasons.push(
        "That is inside the seven-year window, so unclaimed dividends are probably still in the company's unpaid dividend account and the shares still with the company. You claim directly from the company or its registrar (RTA) — no IEPF filing needed.",
      );
    }
  }

  if (input.holderType === "joint") {
    reasons.push(
      "Joint holding: every living joint holder signs the claim. If a joint holder has died, their death certificate is needed.",
    );
  }
  if (input.holderType === "nominee") {
    if (confidence === "likely") confidence = "possible";
    reasons.push(
      "As a nominee, the holding must first be transmitted to your name using the holder's death certificate and the nomination record. We confirm the nomination with the company or registrar before anything else.",
    );
  }

  if (!input.identifier) {
    inputNotes.push(
      "No folio or demat number given. That's fine to start — it is printed on share certificates, dividend warrants and old annual reports, and helps the registrar find the holding faster.",
    );
  }

  nextSteps.push(
    "Search the list yourself using the holder's name exactly as it appeared on the certificate — the official search is free.",
    "Collect any share certificate, dividend warrant, or letter from the company or its registrar.",
    "Make sure you have an active demat account in the same name. IEPF returns shares only to a demat account.",
  );

  return {
    ...base,
    route,
    routeLabel: ROUTE_LABELS[route],
    confidence,
    headline,
    reasons,
    missing,
    inputNotes,
    nextSteps,
  };
}

function issuerMissing(asset: AssetType): MissingEvidence {
  const what: Record<AssetType, MissingEvidence> = {
    iepf_shares_dividends: {
      field: "Company name",
      why: "Each company publishes its own list of unpaid dividends and has its own registrar. Without the name we cannot say which list to check.",
    },
    mutual_funds: {
      field: "Fund house (AMC)",
      why: "Unclaimed amounts sit with the fund house. Without the name we cannot say which registrar holds your folio.",
    },
    provident_fund: {
      field: "Employer",
      why: "The employer's establishment code links your PF account. Without it, your UAN is the only way to find the account.",
    },
    bank_deposits: {
      field: "Bank name",
      why: "Claims are made at the bank that held the account, so we need to know which one.",
    },
  };
  return what[asset];
}

function institutionRoute(
  asset: Exclude<AssetType, "iepf_shares_dividends">,
  issuer: string | null,
  missing: MissingEvidence[],
): Pick<
  RouteDecision,
  "route" | "routeLabel" | "confidence" | "headline" | "reasons" | "missing" | "nextSteps"
> {
  if (!issuer && asset !== "provident_fund") missing.push(issuerMissing(asset));
  const notYet =
    "We are starting with IEPF shares and dividends, so we are not taking these cases yet. The official route below is free.";

  if (asset === "mutual_funds") {
    return {
      route: "company_rta",
      routeLabel: "Fund house / RTA route",
      confidence: "likely",
      headline: "Likely fund house / RTA route",
      reasons: [
        "Unclaimed mutual fund redemptions and dividends stay with the fund house (AMC). They do not go to IEPF.",
        "Claims go to the AMC or its registrar. You can search your folios yourself on MF Central.",
        notYet,
      ],
      missing,
      nextSteps: [
        "Search MF Central with your PAN and registered mobile or email.",
        "If your contact details have changed, the AMC or registrar can update them against your PAN (KYC).",
      ],
    };
  }
  if (asset === "provident_fund") {
    return {
      route: "institution",
      routeLabel: "EPFO route",
      confidence: "likely",
      headline: "Likely direct EPFO route",
      reasons: [
        "PF claims go through EPFO — on the member portal with your UAN, or through your last employer — including for accounts that have gone inoperative.",
        notYet,
      ],
      missing,
      nextSteps: [
        "Find your UAN on an old payslip or ask your last employer's HR team.",
        "Log in to the EPFO member portal yourself. We will never ask for your EPFO password or OTP.",
      ],
    };
  }
  return {
    route: "institution",
    routeLabel: "Bank route (via RBI UDGAM search)",
    confidence: "likely",
    headline: "Likely direct bank route",
    reasons: [
      "Deposits left unclaimed for 10 years or more are moved to RBI's Depositor Education and Awareness (DEA) Fund, but you still claim through the bank that held the account.",
      "RBI's UDGAM portal lets you search several banks at once.",
      notYet,
    ],
    missing,
    nextSteps: [
      "Search on RBI UDGAM with the account holder's name.",
      "Visit the bank with KYC documents to claim. We only ever need the last 4 digits of an account number.",
    ],
  };
}

function selfServiceFor(asset: AssetType): SelfServiceLink[] {
  switch (asset) {
    case "iepf_shares_dividends":
      return [OFFICIAL_LINKS.iepfSearch, OFFICIAL_LINKS.mcaIepf5, OFFICIAL_LINKS.sebiScores];
    case "mutual_funds":
      return [OFFICIAL_LINKS.mfCentral, OFFICIAL_LINKS.sebiScores];
    case "provident_fund":
      return [OFFICIAL_LINKS.epfo];
    case "bank_deposits":
      return [OFFICIAL_LINKS.udgam];
  }
}
