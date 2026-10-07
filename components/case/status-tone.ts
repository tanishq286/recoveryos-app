import type { CaseStatus, ExtractionStatus, TaskStatus } from "@/lib/types";
import type { StatusTone } from "@/components/ui/status-badge";

/*
 * The one place case data meets the status hues. Pages ask for a tone here
 * instead of picking colours, so a status always looks the same everywhere.
 */

const CASE_TONE: Record<CaseStatus, { tone: StatusTone; live?: boolean }> = {
  lead: { tone: "active" },
  consented: { tone: "active" },
  scoped: { tone: "active" },
  awaiting_documents: { tone: "pending" },
  evidence_review: { tone: "pending" },
  client_approval: { tone: "active", live: true },
  ready_to_file: { tone: "iepf", live: false },
  submitted: { tone: "iepf", live: false },
  third_party_verification: { tone: "pending" },
  query_deficiency: { tone: "error" },
  credited: { tone: "success" },
  closed: { tone: "success" },
};

export function caseStatusTone(status: CaseStatus): { tone: StatusTone; live?: boolean } {
  return CASE_TONE[status];
}

export const TASK_TONE: Record<TaskStatus, StatusTone> = {
  open: "active",
  waiting: "pending",
  blocked: "error",
  done: "success",
};

export const EXTRACTION_TONE: Record<ExtractionStatus, StatusTone> = {
  queued: "neutral",
  extracting: "active",
  extracted: "success",
  needs_review: "pending",
  failed: "error",
  not_applicable: "neutral",
};
