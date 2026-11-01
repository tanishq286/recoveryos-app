import type {
  FolioState,
  CustodyStatus,
  IndianState,
  PhysicalCertStatus,
  Relationship,
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
  /** A second name to check, e.g. a joint holder or another family member. */
  jointHolderName?: string;
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

/**
 * Who is looking decides what a result reveals:
 *   public  holder name and place only; company and folio masked, no shares or value
 *   member  signed in through the Login Gateway: company, shares and value; the
 *           folio stays masked until an analyst releases it in the CRM
 *   staff   everything
 */
export type ResultAccess = "public" | "member" | "staff";

export interface SearchResultItem {
  id: string;
  access: ResultAccess;
  investorFullName: string;
  fatherOrSpouseName: string | null;
  city: string | null;
  /** The holder's state, or UNKNOWN when the statement gives none. */
  state: FolioState;
  custodyStatus: CustodyStatus;
  /** "R******e Industries Ltd" for the public. */
  companyName: string;
  /** Null for the public. */
  companySlug: string | null;
  /** "RIL***21" unless released to this client or the viewer is staff. */
  folioNumber: string;
  folioReleased: boolean;
  /** Shares after bonuses and splits. Null for the public. */
  postActionShares: number | null;
  /** Shares × the last synced price + unclaimed amounts, in paise. Null for the public. */
  estimatedTotalValuePaise: number | null;
  /** Last synced market price per share, in paise. Null for the public or before the first sync. */
  sharePricePaise: number | null;
  priceUpdatedAt: string | null;
  unclaimedDividendPaise: number | null;
  eventDate: string | null;
  investmentType: string | null;
  transferFinancialYear: string | null;
  /** Which name on the check matched this row. */
  matchedHolder: "primary" | "joint";
  /** 0..1, how closely the name matched. */
  matchScore: number;
  matchedBy: "exact" | "trigram" | "phonetic" | "sound-alike";
}

export interface SearchResponse {
  mode: SearchMode;
  query: { first: string; middle: string; last: string; state: IndianState; jointHolder: string };
  access: ResultAccess;
  total: number;
  results: SearchResultItem[];
  /** How the estimate is worked out, shown under every result list. */
  valuationBasis: string;
  engine: "meilisearch" | "postgres";
  tookMs: number;
  /** Set when a live refresh was started for this name and state; poll or stream it. */
  liveRefreshId: string | null;
}

export interface OtpRequestBody {
  phone: string;
  purpose: "LOGIN";
}

/** A signed-in member asks Finsol to take up the rows they picked. */
export interface ClaimRequestBody {
  folioIds: string[];
  relationshipToHolder: Relationship;
  physicalCertStatus: PhysicalCertStatus;
  referralCode?: string;
  consent: true;
}

export interface ClaimResponse {
  leadId: string;
  folioCount: number;
}

export const VALUATION_BASIS =
  "Estimate = shares after bonuses and splits × the latest NSE price, plus the unclaimed amount on record. The final share count is confirmed during verification, and value is fixed only on the day shares are credited.";
