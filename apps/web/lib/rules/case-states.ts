import type { CaseStatus, PartyRole, RouteKind } from "@/lib/types";

export interface CaseStateInfo {
  status: CaseStatus;
  label: string;
  /** Short label for the rail at narrow widths. */
  short: string;
  description: string;
  /** Who usually holds the ball in this state. */
  typicalOwner: PartyRole;
  /** Branch states only happen if something goes wrong. */
  branch?: boolean;
}

/** Evidence-to-credit rail, in order. `query_deficiency` is a branch. */
export const CASE_STATES: readonly CaseStateInfo[] = [
  {
    status: "lead",
    label: "Check started",
    short: "Check",
    description: "You told us about a holding you may be able to recover.",
    typicalOwner: "client",
  },
  {
    status: "consented",
    label: "Consent given",
    short: "Consent",
    description: "You agreed, in writing, to how we use your data. You can withdraw at any time.",
    typicalOwner: "client",
  },
  {
    status: "scoped",
    label: "Scope agreed",
    short: "Scope",
    description: "We confirmed which holdings we will pursue, the route, and the fee terms.",
    typicalOwner: "case_lead",
  },
  {
    status: "awaiting_documents",
    label: "Collecting documents",
    short: "Documents",
    description: "We are gathering documents from you, the company, or its registrar.",
    typicalOwner: "client",
  },
  {
    status: "evidence_review",
    label: "Evidence review",
    short: "Review",
    description: "We read each document field by field and check details match across them.",
    typicalOwner: "case_lead",
  },
  {
    status: "client_approval",
    label: "Your approval",
    short: "Approval",
    description: "You approve the complete filing pack. Nothing is signed or sent before this.",
    typicalOwner: "client",
  },
  {
    status: "ready_to_file",
    label: "Ready to file",
    short: "Ready",
    description: "The pack is approved and the filing is scheduled.",
    typicalOwner: "case_lead",
  },
  {
    status: "submitted",
    label: "Filed",
    short: "Filed",
    description:
      "IEPF-5 is filed on the MCA portal and the signed pack is sent to the company's nodal officer.",
    typicalOwner: "case_lead",
  },
  {
    status: "third_party_verification",
    label: "Company & IEPF verification",
    short: "Verification",
    description:
      "The company verifies the claim and reports to the IEPF Authority, which makes the decision.",
    typicalOwner: "authority",
  },
  {
    status: "query_deficiency",
    label: "Query raised",
    short: "Query",
    description:
      "The company or the IEPF Authority asked for something more. Only happens if needed.",
    typicalOwner: "client",
    branch: true,
  },
  {
    status: "credited",
    label: "Credited",
    short: "Credited",
    description: "Shares are in your demat account, or the refund is in your bank account.",
    typicalOwner: "authority",
  },
  {
    status: "closed",
    label: "Closed",
    short: "Closed",
    description: "Fee settled and your documents returned or deleted as you instructed.",
    typicalOwner: "case_lead",
  },
] as const;

export function stateInfo(status: CaseStatus): CaseStateInfo {
  const info = CASE_STATES.find((s) => s.status === status);
  if (!info) throw new Error(`Unknown case status: ${status}`);
  return info;
}

export type RailStepState = "done" | "current" | "blocked" | "upcoming" | "skipped" | "not_needed";

/**
 * Position of every state relative to the case's current status and history.
 * The query branch shows as "not needed" unless the case has actually entered it.
 */
export function railStates(
  current: CaseStatus,
  history: { status: CaseStatus }[],
): { info: CaseStateInfo; state: RailStepState }[] {
  const visited = new Set(history.map((h) => h.status));
  const mainline = CASE_STATES.filter((s) => !s.branch).map((s) => s.status);
  const currentIndex =
    current === "query_deficiency"
      ? mainline.indexOf("third_party_verification")
      : mainline.indexOf(current);

  return CASE_STATES.map((info) => {
    if (info.branch) {
      if (current === info.status) return { info, state: "blocked" as const };
      if (visited.has(info.status)) return { info, state: "done" as const };
      const pastBranchPoint = currentIndex > mainline.indexOf("third_party_verification");
      return { info, state: pastBranchPoint ? ("not_needed" as const) : ("upcoming" as const) };
    }
    const idx = mainline.indexOf(info.status);
    if (info.status === current) return { info, state: "current" as const };
    if (current === "query_deficiency" && info.status === "third_party_verification") {
      return { info, state: "current" as const };
    }
    if (idx < currentIndex) {
      return { info, state: visited.has(info.status) ? ("done" as const) : ("skipped" as const) };
    }
    return { info, state: "upcoming" as const };
  });
}

/** Mainline progress, e.g. step 5 of 11. */
export function railProgress(current: CaseStatus): { step: number; total: number } {
  const mainline = CASE_STATES.filter((s) => !s.branch).map((s) => s.status);
  const idx =
    current === "query_deficiency"
      ? mainline.indexOf("third_party_verification")
      : mainline.indexOf(current);
  return { step: idx + 1, total: mainline.length };
}

export const ROUTE_LABELS: Record<RouteKind, string> = {
  iepf: "IEPF route (Form IEPF-5)",
  company_rta: "Company / RTA route",
  institution: "Direct institution route",
  manual_review: "Needs manual review",
  insufficient_evidence: "Route not yet determined",
};

export const PARTY_ROLE_LABELS: Record<PartyRole, string> = {
  client: "You",
  case_lead: "Your case lead",
  reviewer: "Evidence reviewer",
  company: "Company",
  rta: "Registrar (RTA)",
  authority: "IEPF Authority",
  broker: "Your broker / DP",
  system: "RecoveryOS",
};
