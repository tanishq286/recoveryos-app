import "server-only";

import type {
  CaseDetail,
  CaseSummary,
  EligibilityAssessment,
  EvidenceRoom,
  FieldReviewInput,
  FieldReviewResult,
  TriageInput,
} from "@/lib/types";
import { createMockDataSource } from "@/lib/mock/adapter";

/**
 * The only door between the UI and case data.
 *
 * Pages and server actions call `getDataSource()` and never import an adapter
 * directly. Today the only adapter is an in-memory mock with fictional data,
 * so `npm run dev` works with zero environment variables. A Supabase adapter
 * implementing the same interface slots in later against
 * supabase/migrations/0001_init.sql — see README "Swapping in Supabase".
 */
export interface RecoveryDataSource {
  readonly kind: "mock" | "supabase";

  listCases(): Promise<CaseSummary[]>;
  /** null when the case does not exist or the viewer may not see it. */
  getCase(caseId: string): Promise<CaseDetail | null>;
  /** null when the case does not exist or the viewer may not see it. */
  getEvidenceRoom(caseId: string): Promise<EvidenceRoom | null>;

  /** Client approves or corrects one extracted field. Writes an audit event. */
  reviewField(input: FieldReviewInput): Promise<FieldReviewResult>;

  /**
   * Route assessment for the guided check. Returns an honest receipt of which
   * sources were and were not consulted; never a fabricated match.
   */
  assessEligibility(input: TriageInput): Promise<EligibilityAssessment>;
}

let instance: RecoveryDataSource | null = null;

export function getDataSource(): RecoveryDataSource {
  if (instance) return instance;

  const configured = process.env.RECOVERYOS_DATA_SOURCE ?? "mock";
  if (configured !== "mock") {
    // Fail loudly rather than silently falling back to fictional data.
    throw new Error(
      `RECOVERYOS_DATA_SOURCE="${configured}" is not available in this build. Only "mock" is implemented.`,
    );
  }

  instance = createMockDataSource({
    latencyMs: Number(process.env.MOCK_LATENCY_MS ?? 0) || 0,
  });
  return instance;
}
