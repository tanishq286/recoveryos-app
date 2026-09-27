import type { RecoveryDataSource } from "@/lib/data";
import type {
  CaseDetail,
  CaseSummary,
  EligibilityAssessment,
  ExtractedField,
  SourceCheck,
  TriageInput,
} from "@/lib/types";
import { buildSeed, type MockSeed } from "@/lib/mock/seed";
import { decideRoute } from "@/lib/rules/triage";
import { SOURCE_DIRECTORY } from "@/lib/sources";
import { byNewest } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";

interface MockAuditEvent {
  id: string;
  caseId: string;
  actor: string;
  action: "field.approved" | "field.corrected";
  entityTable: "extracted_fields";
  entityId: string;
  before: Partial<ExtractedField>;
  after: Partial<ExtractedField>;
  occurredAt: string;
}

interface MockStore extends MockSeed {
  audit: MockAuditEvent[];
  seq: number;
}

// Survive dev hot-reloads; reset on server restart. Nothing is persisted.
const globalRef = globalThis as unknown as { __recoveryosMockStore?: MockStore };

function store(): MockStore {
  globalRef.__recoveryosMockStore ??= { ...buildSeed(), audit: [], seq: 0 };
  return globalRef.__recoveryosMockStore;
}

function nextId(prefix: string): string {
  const s = store();
  s.seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${s.seq}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The demo viewer is always the case's own client. */
function viewerName(c: CaseDetail): string {
  return c.claimant.fullName;
}

function waitingOnClient(fields: ExtractedField[], caseId: string): ExtractedField[] {
  return fields.filter(
    (f) =>
      f.caseId === caseId && f.reviewStatus === "pending" && f.needsClientCheck && f.value !== null,
  );
}

/**
 * Keep "what happens next" honest after the client reviews a detail: update
 * the count, or — once nothing is left — close the review task and hand the
 * next step to the next open task, with its real owner and date.
 */
function advanceAfterReview(c: CaseDetail, s: MockStore, now: string) {
  if (c.nextStep.owner.role !== "client") return;
  const pending = waitingOnClient(s.fields, c.id);
  const reviewTask = c.tasks.find(
    (t) => t.completesWhen === "client_details_reviewed" && t.status !== "done",
  );
  if (!reviewTask) return;

  if (pending.length > 0) {
    const fileIds = new Set(pending.map((f) => f.evidenceFileId));
    const file = fileIds.size === 1 ? s.files.find((f) => fileIds.has(f.id)) : undefined;
    const where = file ? `your ${CATEGORY_LABELS[file.category].toLowerCase()}` : "your documents";
    const n = pending.length;
    const what = `confirm ${n} detail${n === 1 ? "" : "s"} we read from ${where}`;
    c.nextStep.waitingFor = `you to ${what}`;
    reviewTask.title = what.charAt(0).toUpperCase() + what.slice(1);
    return;
  }

  reviewTask.status = "done";
  reviewTask.completedAt = now;
  const next = c.tasks
    .filter((t) => t.status === "open")
    .sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"))[0];
  if (next) {
    c.nextStep = {
      ...c.nextStep,
      waitingFor: `${next.owner.role === "client" ? "you" : next.owner.name} to ${next.title.charAt(0).toLowerCase()}${next.title.slice(1)}`,
      owner: next.owner,
      nextDate: next.dueOn ?? c.nextStep.nextDate,
      dateMeaning: next.dueMeaning,
      whyItMatters: next.detail,
    };
  }
}

function toSummary(c: CaseDetail): CaseSummary {
  return {
    id: c.id,
    reference: c.reference,
    title: c.title,
    status: c.status,
    route: c.route,
    claimantName: c.claimant.fullName,
    issuerNames: c.assets.map((a) => a.issuerName),
    waitingFor: c.nextStep.waitingFor,
    nextOwner: c.nextStep.owner,
    nextDate: c.nextStep.nextDate,
    hasBlocker: c.nextStep.blocker !== null,
    updatedAt: c.updatedAt,
  };
}

function sourceChecks(input: TriageInput, now: string, routeLabel: string): SourceCheck[] {
  const checks: SourceCheck[] = [
    {
      id: "rules",
      sourceName: "RecoveryOS route rules",
      operator: "RecoveryOS (versioned rule set)",
      url: null,
      whatWeChecked:
        "Your answers — asset type, years since the last dividend or transaction, and how you hold it — against the published rule set.",
      status: "checked",
      statusDetail: `Applied. Result: ${routeLabel}.`,
      checkedAt: now,
    },
  ];

  for (const src of SOURCE_DIRECTORY.filter((s) => s.assetTypes.includes(input.assetType))) {
    const needsIssuer = src.needs.includes("issuer");
    const base = {
      id: src.id,
      sourceName: src.sourceName,
      operator: src.operator,
      url: src.url,
      checkedAt: null,
    };

    if (needsIssuer && !input.issuerName?.trim()) {
      checks.push({
        ...base,
        whatWeChecked: "Nothing — this list is organised by company.",
        status: "insufficient_evidence",
        statusDetail: "Not queried: no company name was given, so there is no list to look in.",
      });
      continue;
    }

    if (!src.liveConnector) {
      const byLogin = src.needs.includes("your_login");
      checks.push({
        ...base,
        whatWeChecked: byLogin
          ? "Nothing — this source needs your own login."
          : `Nothing yet — the lookup would use the holder's name${needsIssuer ? " and the company" : ""}.`,
        status: "not_connected",
        statusDetail: byLogin
          ? "Not queried. It needs your own login, and we will never ask for your password or OTP. You can check it yourself for free."
          : "Not queried. There is no live connection to this source in this build, so we have not looked you up and are not showing a result. You can search it yourself for free.",
      });
    }
  }
  return checks;
}

export function createMockDataSource(opts: { latencyMs: number }): RecoveryDataSource {
  const wait = () => (opts.latencyMs > 0 ? sleep(opts.latencyMs) : Promise.resolve());

  return {
    kind: "mock",

    async listCases() {
      await wait();
      return store()
        .cases.map(toSummary)
        .sort((a, b) => byNewest(a.updatedAt, b.updatedAt));
    },

    async getCase(caseId) {
      await wait();
      const c = store().cases.find((x) => x.id === caseId);
      return c ? structuredClone(c) : null;
    },

    async getEvidenceRoom(caseId) {
      await wait();
      const s = store();
      const c = s.cases.find((x) => x.id === caseId);
      if (!c) return null;
      return structuredClone({
        caseId: c.id,
        reference: c.reference,
        title: c.title,
        status: c.status,
        files: s.files
          .filter((f) => f.caseId === caseId)
          .sort((a, b) => byNewest(a.uploadedAt, b.uploadedAt)),
        fields: s.fields.filter((f) => f.caseId === caseId),
      });
    },

    async reviewField(input) {
      await wait();
      const s = store();
      const c = s.cases.find((x) => x.id === input.caseId);
      const f = s.fields.find((x) => x.id === input.fieldId && x.caseId === input.caseId);
      if (!c || !f) return { ok: false, error: "We couldn't find that detail on this case." };
      if (f.reviewStatus !== "pending") {
        return {
          ok: false,
          error: "This detail has already been reviewed. Ask your case lead if it needs reopening.",
        };
      }
      if (f.value === null) {
        return {
          ok: false,
          error: "There is no value to approve — this detail was not found in the document.",
        };
      }

      const before = { reviewStatus: f.reviewStatus, correctedValue: f.correctedValue };
      const now = new Date().toISOString();
      f.reviewStatus = input.decision === "approve" ? "approved" : "corrected";
      f.reviewedAt = now;
      f.reviewedBy = viewerName(c);
      if (input.decision === "correct") {
        f.correctedValue = input.correctedValue;
        f.correctionReason = input.reason;
      }

      const auditEventId = nextId("audit");
      s.audit.push({
        id: auditEventId,
        caseId: c.id,
        actor: viewerName(c),
        action: input.decision === "approve" ? "field.approved" : "field.corrected",
        entityTable: "extracted_fields",
        entityId: f.id,
        before,
        after: { reviewStatus: f.reviewStatus, correctedValue: f.correctedValue },
        occurredAt: now,
      });
      c.timeline.push({
        id: nextId("tl"),
        caseId: c.id,
        occurredAt: now,
        kind: "review",
        title:
          input.decision === "approve" ? `You confirmed: ${f.label}` : `You corrected: ${f.label}`,
        detail: input.decision === "correct" ? input.reason : null,
        actor: { name: viewerName(c), role: "client" },
      });
      advanceAfterReview(c, s, now);
      c.updatedAt = now;
      c.version += 1;

      return { ok: true, field: structuredClone(f), auditEventId };
    },

    async assessEligibility(input) {
      await wait();
      const now = new Date();
      const decision = decideRoute(input, now);
      const assessedAt = now.toISOString();
      const assessment: EligibilityAssessment = {
        ...decision,
        id: nextId("assess"),
        assessedAt,
        sources: sourceChecks(input, assessedAt, decision.routeLabel),
      };
      return assessment;
    },
  };
}
