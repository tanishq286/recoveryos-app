import type { CaseStatus, HolderType } from "@/lib/types";
import { railStates, type RailStepState } from "@/lib/rules/case-states";
import { daysBetween, instant } from "@/lib/format";

/*
 * The six-stage IEPF lifecycle is a display grouping of the case states in
 * case-states.ts. It changes no data and no rule: every stage is made of
 * existing statuses, and every date comes from the case's status history.
 * No duration is ever estimated for a stage that hasn't started.
 */

export type LifecycleStageKey =
  | "discovery"
  | "affirmation"
  | "rta_verification"
  | "iepf5_filing"
  | "company_verification"
  | "demat_credit";

interface StageDef {
  key: LifecycleStageKey;
  label: string;
  short: string;
  description: string;
  statuses: readonly CaseStatus[];
  /** IEPF legal and regulatory stages wear the IEPF hue. */
  regulatory?: boolean;
}

const STAGES: readonly StageDef[] = [
  {
    key: "discovery",
    label: "Discovery",
    short: "Discovery",
    description:
      "The holding is identified, you give consent in writing, and the scope and fee are agreed.",
    statuses: ["lead", "consented", "scoped"],
  },
  {
    key: "affirmation",
    label: "Claimant affirmation",
    short: "Affirmation",
    description:
      "You gather the documents that prove the holding is yours: certificates, identity and bank proof.",
    statuses: ["awaiting_documents"],
  },
  {
    key: "rta_verification",
    label: "RTA verification",
    short: "RTA check",
    description:
      "Every detail is read and checked against the company's and registrar's records before anything is filed.",
    statuses: ["evidence_review"],
  },
  {
    key: "iepf5_filing",
    label: "IEPF-5 filing",
    short: "IEPF-5",
    description:
      "You approve the complete pack, then Form IEPF-5 is filed on the MCA portal and the signed pack goes to the company.",
    statuses: ["client_approval", "ready_to_file", "submitted"],
    regulatory: true,
  },
  {
    key: "company_verification",
    label: "Company verification (CVR)",
    short: "CVR",
    description:
      "The company verifies the claim and sends its verification report to the IEPF Authority, which decides.",
    statuses: ["third_party_verification", "query_deficiency"],
    regulatory: true,
  },
  {
    key: "demat_credit",
    label: "Demat credit",
    short: "Credit",
    description:
      "Shares reach your demat account, or the refund reaches your bank. Then the case is closed.",
    statuses: ["credited", "closed"],
  },
];

/** Heir claims affirm the succession, not just the holding. */
function forHolder(def: StageDef, holder: HolderType | null): StageDef {
  if (def.key !== "affirmation" || holder !== "heir") return def;
  return {
    ...def,
    label: "Heir affirmation",
    description:
      "You gather the documents that prove the holding and your right to it as heir: death certificate, succession papers, identity and bank proof.",
  };
}

export type StageState = "done" | "current" | "blocked" | "upcoming" | "skipped";

export interface LifecycleSubStep {
  status: CaseStatus;
  state: RailStepState;
  /** When the case entered this status, if it has. */
  at: string | null;
}

export interface LifecycleStage extends StageDef {
  index: number;
  state: StageState;
  /** First recorded entry into any of this stage's statuses. */
  startedAt: string | null;
  /** When the next stage began (done stages only). */
  endedAt: string | null;
  /** Whole IST calendar days, from history only. Null if the stage hasn't started. */
  days: number | null;
  steps: LifecycleSubStep[];
}

export function lifecycleStages(input: {
  status: CaseStatus;
  history: { status: CaseStatus; at: string }[];
  updatedAt: string;
  holderType: HolderType | null;
}): LifecycleStage[] {
  const { status, history, updatedAt, holderType } = input;
  const rail = new Map(railStates(status, history).map((r) => [r.info.status, r.state]));
  const firstAt = new Map<CaseStatus, string>();
  for (const h of history) if (!firstAt.has(h.status)) firstAt.set(h.status, h.at);

  const currentIndex = STAGES.findIndex((s) => s.statuses.includes(status));
  const starts = STAGES.map((s) => {
    const dates = s.statuses.map((st) => firstAt.get(st)).filter((d): d is string => !!d);
    return dates.length ? dates.sort((a, b) => instant(a) - instant(b))[0] : null;
  });
  const lastEvent = history.at(-1)?.at ?? updatedAt;
  const now = instant(updatedAt) > instant(lastEvent) ? updatedAt : lastEvent;

  return STAGES.map((raw, index) => {
    const def = forHolder(raw, holderType);
    const startedAt = starts[index];
    let state: StageState;
    if (index === currentIndex) state = status === "query_deficiency" ? "blocked" : "current";
    else if (index < currentIndex) state = startedAt ? "done" : "skipped";
    else state = "upcoming";

    const nextStart = starts.slice(index + 1).find((d) => d !== null) ?? null;
    const endedAt = state === "done" ? nextStart : null;
    const days =
      startedAt === null
        ? null
        : state === "done" && endedAt
          ? daysBetween(startedAt, endedAt)
          : state === "current" || state === "blocked"
            ? daysBetween(startedAt, now)
            : null;

    return {
      ...def,
      index,
      state,
      startedAt,
      endedAt,
      days,
      steps: def.statuses.map((st) => ({
        status: st,
        state: rail.get(st) ?? "upcoming",
        at: firstAt.get(st) ?? null,
      })),
    };
  });
}

/** Where a status sits on the six stages, from the status alone (lists, previews). */
export function stageOf(status: CaseStatus): {
  index: number;
  total: number;
  label: string;
  short: string;
} {
  const index = STAGES.findIndex((s) => s.statuses.includes(status));
  const def = STAGES[index];
  return { index, total: STAGES.length, label: def.label, short: def.short };
}

export const LIFECYCLE_SHORT_LABELS = STAGES.map((s) => s.short);
