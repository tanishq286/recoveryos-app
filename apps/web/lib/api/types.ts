import type {
  CorporateActionType,
  CrmStage,
  CustodyStatus,
  DocStatus,
  DocType,
  EsignStatus,
  IndianState,
  IngestionStatus,
  LedgerEntryType,
  Profession,
  Role,
  RtaName,
  ScenarioType,
  TrackStatus,
} from "@recoveryos/shared";

/** Response shapes of the RecoveryOS API, as the web app reads them. */

export interface Stats {
  folios: number;
  companies: number;
  states: number;
  estimatedValuePaise: number;
  activeCases: number;
  creditedCases: number;
  verifiedAssociates: number;
  asOf: string;
}

export interface CompanyListItem {
  slug: string;
  name: string;
  sector: string | null;
  tickerNse: string | null;
  rtaName: RtaName;
  rtaLabel: string;
  currentMarketPrice: number | null;
  priceUpdatedAt: string | null;
  folioCount: number;
  updatedAt: string | null;
}

export interface CompanyAction {
  actionType: CorporateActionType;
  exDate: string;
  ratioFrom: number | null;
  ratioTo: number | null;
  dividendPerShare: number | null;
  notes: string | null;
  source: string | null;
}

export interface CompanyDetail {
  slug: string;
  name: string;
  cin: string | null;
  statutoryBasis: string | null;
  isin: string | null;
  sector: string | null;
  tickerNse: string | null;
  tickerBse: string | null;
  /** Last synced market price (rupees); null until the first sync. */
  currentMarketPrice: number | null;
  priceUpdatedAt: string | null;
  priceSource: string | null;
  rta: {
    name: RtaName;
    label: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
  };
  nodalOfficer: {
    name: string;
    emails: string[];
    phone: string | null;
    address: string | null;
    deputies: { name: string; email: string | null }[];
  };
  contacts: { source: string | null; verifiedAt: string | null };
  irPageUrl: string | null;
  corporateActions: CompanyAction[];
  records: {
    custodyStatus: CustodyStatus;
    folios: number;
    shares: number;
    dividendRupees: number;
  }[];
}

export interface Me {
  id: string;
  name: string;
  role: Role;
  phone: string;
  email: string | null;
  associate: { id: string; referralCode: string; isVerified: boolean } | null;
}

export interface CaseSummary {
  caseCode: string;
  clientName: string;
  companyName: string;
  companySlug: string;
  scenarioType: ScenarioType;
  scenarioLabel: string;
  recoverStep: number;
  recoverStepName: string;
  esignStatus: EsignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  docType: DocType;
  label: string;
  reason: string;
  beforeFiling: boolean;
  status: DocStatus;
  fileName: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  reviewerComment: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  hasFile: boolean;
}

export interface CaseDetail extends CaseSummary {
  viewerRole: "staff" | "client" | "associate";
  client: { name: string; phone: string | null };
  associate: { firmName: string; name: string } | null;
  company: {
    name: string;
    slug: string;
    rtaLabel: string;
    rtaAddress: string | null;
    nodalOfficerName: string | null;
    nodalOfficerEmail: string | null;
  };
  holding: {
    holderName: string;
    folioNumber: string;
    certificateNumbers: string | null;
    originalShares: number;
    postActionShares: number;
    unclaimedDividendPaise: number;
    custodyStatus: CustodyStatus;
    custodyLabel: string;
    transferFinancialYear: string | null;
  } | null;
  steps: {
    step: number;
    key: string;
    letter: string;
    name: string;
    summary: string;
    owner: Role;
    state: "done" | "current" | "upcoming";
  }[];
  tracking: {
    rtaEntitlementStatus: TrackStatus;
    mcaIepf5Srn: string | null;
    nodalVerificationStatus: TrackStatus;
    dematCreditStatus: TrackStatus;
  };
  esign: {
    status: EsignStatus;
    signedAt: string | null;
    provider: string;
    requested: boolean;
    hasMandate: boolean;
  };
  money: {
    feePct: number;
    basis: "credited" | "estimate";
    grossPaise: number;
    feeBps: number;
    feePaise: number;
    gstPaise: number;
    netPaise: number;
    sharePricePaise: number | null;
    priceUpdatedAt: string | null;
    priceSource: string | null;
  };
  timelineMonths: [number, number];
  vault: VaultItem[];
  vaultProgress: { required: number; verified: number; uploaded: number; rejected: number };
  events: {
    id: string;
    kind: string;
    message: string;
    actorName: string | null;
    createdAt: string;
  }[];
}

export interface LeadCard {
  type: "lead";
  id: string;
  claimantName: string;
  phone: string;
  phoneMasked: string;
  phoneVerified: boolean;
  relationship: string;
  certificates: string;
  estimatedValuePaise: number;
  holdings: { folioId: string; holder: string; company: string; shares: number; custody: string }[];
  assignedAnalyst: { id: string; name: string } | null;
  associate: { firmName: string; referralCode: string } | null;
  notes: string | null;
  stage: CrmStage;
  unlockedAt: string | null;
  updatedAt: string;
}

export interface CaseCard {
  type: "case";
  id: string;
  caseCode: string;
  clientName: string;
  companyName: string;
  recoverStep: number;
  recoverStepName: string;
  esignStatus: EsignStatus;
  mcaIepf5Srn: string | null;
  rtaEntitlementStatus: TrackStatus;
  nodalVerificationStatus: TrackStatus;
  dematCreditStatus: TrackStatus;
  associate: { firmName: string } | null;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  label: string;
  kind: "lead" | "case";
  items: (LeadCard | CaseCard)[];
}

export interface Board {
  columns: BoardColumn[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
}

export interface LocatorEntry {
  id: string;
  name: string;
  firmName: string;
  profession: Profession;
  professionLabel: string;
  state: IndianState;
  stateLabel: string;
  city: string;
  bio: string | null;
  referralCode: string;
}

export interface AssociateDashboard {
  profile: {
    name: string;
    firmName: string;
    profession: Profession;
    professionLabel: string;
    state: IndianState;
    city: string;
    referralCode: string;
    revenueSharePct: number;
    isVerified: boolean;
    totalReferredCases: number;
  };
  totals: { accruedPaise: number; paidPaise: number; balancePaise: number };
  monthly: { month: string; accruedPaise: number; paidPaise: number }[];
  ledger: {
    id: string;
    entryType: LedgerEntryType;
    amountPaise: number;
    description: string;
    occurredAt: string;
    balancePaise: number;
  }[];
  leads: {
    id: string;
    claimantName: string;
    crmStage: CrmStage;
    phoneVerified: boolean;
    createdAt: string;
    estimatedValuePaise: number;
  }[];
  cases: {
    caseCode: string;
    clientName: string;
    companyName: string;
    recoverStep: number;
    dematCreditStatus: TrackStatus;
  }[];
}

export interface IngestionJob {
  id: string;
  formType: "IEPF_2" | "IEPF_4";
  fileName: string;
  sourceUrl: string | null;
  status: IngestionStatus;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errors: { row: number; message: string }[];
  uploadedBy: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
