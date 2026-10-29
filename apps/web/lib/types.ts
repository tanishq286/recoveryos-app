/**
 * Domain types. These mirror supabase/migrations/0001_init.sql (snake_case in
 * Postgres, camelCase here). Money is always integer paise; dates are ISO 8601
 * strings (UTC instants, or YYYY-MM-DD for calendar dates).
 */

export const CASE_STATUSES = [
  "lead",
  "consented",
  "scoped",
  "awaiting_documents",
  "evidence_review",
  "client_approval",
  "ready_to_file",
  "submitted",
  "third_party_verification",
  "query_deficiency",
  "credited",
  "closed",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const ASSET_TYPES = [
  "iepf_shares_dividends",
  "mutual_funds",
  "provident_fund",
  "bank_deposits",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const HOLDER_TYPES = ["self", "joint", "nominee", "heir"] as const;
export type HolderType = (typeof HOLDER_TYPES)[number];

export type RouteKind =
  "iepf" | "company_rta" | "institution" | "manual_review" | "insufficient_evidence";

export type PartyRole =
  "client" | "case_lead" | "reviewer" | "company" | "rta" | "authority" | "broker" | "system";

/** Someone who owns a step. Always named — never "the system will". */
export interface Party {
  name: string;
  role: PartyRole;
  organization?: string;
}

/** Every mutable record carries these (see migration). */
export interface RecordMeta {
  createdAt: string;
  updatedAt: string;
  actorId: string;
  version: number;
}

export interface Claimant {
  id: string;
  caseId: string;
  fullName: string;
  holderType: HolderType;
  /** For nominees and heirs: relationship to the original holder. */
  relationshipToHolder: string | null;
  originalHolderName: string | null;
  city: string;
  /** Only the last characters are ever shown or stored in plain columns. */
  panLast4: string | null;
}

export interface Asset {
  id: string;
  caseId: string;
  assetType: AssetType;
  issuerName: string;
  rtaName: string | null;
  folioNumber: string | null;
  shareQuantity: number | null;
  /** null = not yet confirmed from a document. Never estimated. */
  dividendAmountPaise: number | null;
  transferredToIepfOn: string | null;
  financialYears: string[];
  /** Where each number above came from. */
  sourceNote: string;
}

export const EVIDENCE_CATEGORIES = [
  "share_certificate",
  "identity_proof",
  "address_proof",
  "bank_proof",
  "demat_proof",
  "company_correspondence",
  "name_change_proof",
  "succession_document",
  "iepf_filing",
  "authority_correspondence",
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export type ExtractionStatus =
  "queued" | "extracting" | "extracted" | "needs_review" | "failed" | "not_applicable";

export interface EvidenceFile {
  id: string;
  caseId: string;
  fileName: string;
  category: EvidenceCategory;
  mimeType: string;
  byteSize: number;
  pageCount: number;
  uploadedAt: string;
  uploadedBy: Party;
  /** SHA-256 of the file bytes, hex, computed on arrival. */
  sha256: string;
  extractionStatus: ExtractionStatus;
  /** Plain-English explanation for failed / needs_review states. */
  extractionNote: string | null;
}

export type Confidence = "high" | "medium" | "low" | "not_found";
export type ReviewStatus = "pending" | "approved" | "corrected";

export interface ExtractedField {
  id: string;
  caseId: string;
  evidenceFileId: string;
  fieldKey: string;
  label: string;
  /** null = the field was not found. We never fill a gap with a guess. */
  value: string | null;
  sourcePage: number | null;
  /** Verbatim line from the document where the value was read. */
  sourceSnippet: string | null;
  confidence: Confidence;
  confidenceReason: string;
  /** Cross-document check, e.g. "Matches PAN card". */
  crossCheck: { outcome: "match" | "mismatch" | "not_checked"; note: string } | null;
  reviewStatus: ReviewStatus;
  correctedValue: string | null;
  correctionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /** Does this field need the client's eyes? */
  needsClientCheck: boolean;
}

export type TaskStatus = "open" | "waiting" | "blocked" | "done";

export interface CaseTask {
  id: string;
  caseId: string;
  title: string;
  detail: string;
  owner: Party;
  dueOn: string | null;
  dueMeaning: "due" | "expected";
  status: TaskStatus;
  completedAt: string | null;
  /** Closes itself when the client has reviewed every detail waiting for them. */
  completesWhen?: "client_details_reviewed";
}

export type TimelineKind =
  | "status_change"
  | "consent"
  | "document"
  | "message"
  | "external"
  | "submission"
  | "review"
  | "flag";

export interface TimelineEvent {
  id: string;
  caseId: string;
  occurredAt: string;
  kind: TimelineKind;
  title: string;
  detail: string | null;
  actor: Party;
  toStatus?: CaseStatus;
}

export interface NextStep {
  /** Always phrased "We are waiting for …". */
  waitingFor: string;
  owner: Party;
  nextDate: string;
  dateMeaning: "due" | "expected" | "follow_up";
  whyItMatters: string;
  afterThat: string;
  blocker: { title: string; detail: string } | null;
}

export interface Quote {
  id: string;
  caseId: string;
  status: "not_shared" | "shared" | "accepted";
  successFeeBps: number;
  protectionAllocationBps: number;
  /** null = client has not chosen yet. */
  protectionOptIn: boolean | null;
  indicativeValuePaise: number | null;
  indicativeValueBasis: string | null;
  excludedFromEstimate: string[];
  valuationRule: string;
  conditions: string[];
  sharedAt: string | null;
  acceptedAt: string | null;
}

export interface Consent {
  id: string;
  caseId: string;
  purpose: string;
  noticeVersion: string;
  grantedAt: string;
  withdrawnAt: string | null;
}

export interface Submission {
  id: string;
  caseId: string;
  kind: "iepf5" | "rta_request" | "query_response";
  reference: string | null;
  submittedOn: string | null;
  status: "draft" | "filed" | "acknowledged" | "query_raised" | "approved" | "rejected";
  note: string;
}

export interface CaseSummary {
  id: string;
  reference: string;
  title: string;
  status: CaseStatus;
  route: RouteKind;
  claimantName: string;
  issuerNames: string[];
  waitingFor: string;
  nextOwner: Party;
  nextDate: string;
  hasBlocker: boolean;
  updatedAt: string;
}

export interface CaseDetail extends RecordMeta {
  id: string;
  reference: string;
  title: string;
  status: CaseStatus;
  statusChangedAt: string;
  /** Statuses the case has actually passed through, in order. */
  statusHistory: { status: CaseStatus; at: string }[];
  route: RouteKind;
  routeNote: string;
  caseLead: Party;
  claimant: Claimant;
  assets: Asset[];
  nextStep: NextStep;
  tasks: CaseTask[];
  timeline: TimelineEvent[];
  quote: Quote;
  consents: Consent[];
  submissions: Submission[];
  isSample: true;
}

export interface EvidenceRoom {
  caseId: string;
  reference: string;
  title: string;
  status: CaseStatus;
  files: EvidenceFile[];
  fields: ExtractedField[];
}

/* ---------------------------------------------------------------- triage */

export type IdentifierKind = "folio" | "dp_client" | "uan" | "account_last4";

export interface TriageInput {
  assetType: AssetType;
  issuerName: string | null;
  /** Year the holder last received or encashed a dividend / transacted. */
  lastActivityYear: number | null;
  /** Year the holding was bought or the account opened, if known. */
  acquiredYear: number | null;
  identifierKind: IdentifierKind | null;
  identifier: string | null;
  holderType: HolderType;
}

export type SourceCheckStatus =
  "checked" | "match_found" | "no_match" | "not_connected" | "insufficient_evidence" | "error";

export interface SourceCheck {
  id: string;
  sourceName: string;
  operator: string;
  url: string | null;
  whatWeChecked: string;
  status: SourceCheckStatus;
  statusDetail: string;
  /** null when the source was not queried. Never back-filled. */
  checkedAt: string | null;
}

export interface MissingEvidence {
  field: string;
  why: string;
}

export interface SelfServiceLink {
  label: string;
  href: string;
  note: string;
}

export interface EligibilityAssessment {
  id: string;
  assessedAt: string;
  ruleVersion: { id: string; label: string; effectiveFrom: string; status: "demo" | "published" };
  route: RouteKind;
  routeLabel: string;
  confidence: "likely" | "possible" | "undetermined";
  headline: string;
  reasons: string[];
  missing: MissingEvidence[];
  inputNotes: string[];
  nextSteps: string[];
  sources: SourceCheck[];
  selfService: SelfServiceLink[];
  /** RecoveryOS currently takes IEPF cases only. */
  inScope: boolean;
}

export type FieldReviewInput =
  | { caseId: string; fieldId: string; decision: "approve" }
  | {
      caseId: string;
      fieldId: string;
      decision: "correct";
      correctedValue: string;
      reason: string;
    };

export type FieldReviewResult =
  { ok: true; field: ExtractedField; auditEventId: string } | { ok: false; error: string };
