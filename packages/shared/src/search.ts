import type {
  FolioState,
  CustodyStatus,
  IndianState,
  PhysicalCertStatus,
  Relationship,
  RtaName,
} from "./enums.js";
import { normalizeName, splitName } from "./names.js";

/**
 * The public search contract, shared by the API and the web app.
 * Four ways to search, each scoped to a state:
 *   FULL    first + middle + last (any two or more parts, or a full name)
 *   FIRST   first name only
 *   MIDDLE  middle name only
 *   LAST    last name only (surname)
 */
export type SearchMode = "FULL" | "FIRST" | "MIDDLE" | "LAST";

export interface SearchInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  state: IndianState;
  custodyStatus?: CustodyStatus;
}

export interface ResolvedSearch {
  mode: SearchMode;
  first: string;
  middle: string;
  last: string;
  state: IndianState;
  custodyStatus?: CustodyStatus;
}

/** Works out which of the four searches the input asks for, or null when no name was given. */
export function resolveSearch(input: SearchInput): ResolvedSearch | null {
  let first = normalizeName(input.firstName);
  let middle = normalizeName(input.middleName);
  let last = normalizeName(input.lastName);
  if (!first && !middle && !last && input.fullName) {
    const parts = splitName(input.fullName);
    first = parts.first;
    middle = parts.middle;
    last = parts.last;
  }
  const given = [first, middle, last].filter(Boolean).length;
  if (given === 0) return null;
  const mode: SearchMode = given >= 2 ? "FULL" : first ? "FIRST" : middle ? "MIDDLE" : "LAST";
  return { mode, first, middle, last, state: input.state, custodyStatus: input.custodyStatus };
}

/** What every visitor sees for a matching folio. */
export interface SearchTeaser {
  id: string;
  investorFullName: string;
  fatherOrSpouseName: string | null;
  city: string | null;
  /** The holder's state, or UNKNOWN when the statement gives none. */
  state: FolioState;
  custodyStatus: CustodyStatus;
  postActionShares: number;
  /** "Date of Event" / proposed transfer date on the statement (YYYY-MM-DD). */
  eventDate: string | null;
  /** The statement's investment type, e.g. "Amount for unclaimed and unpaid dividend". */
  investmentType: string | null;
  /**
   * Shares × the last synced market price + unclaimed amounts on record, in
   * paise. An estimate, labelled as one. Without a price it is the unclaimed
   * amount alone, and `sharePricePaise` is null.
   */
  estimatedTotalValuePaise: number;
  /** Last synced market price per share, in paise; null until the first sync. */
  sharePricePaise: number | null;
  /** When that price was fetched (ISO). */
  priceUpdatedAt: string | null;
  /** "R******e Industries Ltd" until unlocked. */
  companyName: string;
  /** "RIL***21" until unlocked. */
  folioNumber: string;
  transferFinancialYear: string | null;
  /** 0..1, how closely the name matched. */
  matchScore: number;
  /** Why it matched: "trigram", "phonetic" or "soundex". */
  matchedBy: "exact" | "trigram" | "phonetic" | "soundex";
  unlocked: false;
}

/** The same row after the visitor verified their phone for it. */
export interface SearchUnlocked extends Omit<SearchTeaser, "unlocked"> {
  unlocked: true;
  companySlug: string;
  rtaName: RtaName;
  rtaLabel: string;
  certificateNumbers: string | null;
  unclaimedDividendPaise: number;
  sourceFilingSrn: string | null;
}

export type SearchResultItem = SearchTeaser | SearchUnlocked;

export interface SearchResponse {
  mode: SearchMode;
  query: { first: string; middle: string; last: string; state: IndianState };
  total: number;
  results: SearchResultItem[];
  /** How the estimate is worked out, shown under every result list. */
  valuationBasis: string;
  engine: "meilisearch" | "postgres";
  tookMs: number;
}

export interface OtpRequestBody {
  phone: string;
  purpose: "UNLOCK" | "LOGIN";
}

export interface UnlockRequestBody {
  name: string;
  phone: string;
  otpCode: string;
  email?: string;
  relationshipToHolder: Relationship;
  physicalCertStatus: PhysicalCertStatus;
  folioIds: string[];
  /** Associate referral code, when the visitor arrived through a partner link. */
  referralCode?: string;
  consent: true;
}

export interface UnlockResponse {
  leadId: string;
  unlockToken: string;
  expiresAt: string;
  results: SearchUnlocked[];
}

export const VALUATION_BASIS =
  "Estimate = shares after bonuses and splits × the latest NSE price, plus the unclaimed amount on the company's IEPF statement. The registrar's entitlement letter confirms the real share count, and value is fixed only on the day shares are credited.";
