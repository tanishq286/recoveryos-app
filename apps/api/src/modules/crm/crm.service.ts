import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@recoveryos/db";
import {
  CRM_STAGE_LABELS,
  CRM_STAGES,
  CUSTODY_LABELS,
  maskPhone,
  RECOVER_STEPS,
  RELATIONSHIP_LABELS,
  PHYSICAL_CERT_LABELS,
  type CrmStage,
  type ScenarioType,
} from "@recoveryos/shared";

import { AuditService } from "../../common/audit.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { isoTime, num } from "../../common/serialize.js";

/** Where a case lands on the board, by R.E.C.O.V.E.R. step. */
export const CASE_COLUMNS = [
  { id: "CASE_VERIFY", label: "Mandate and eSign", steps: [1, 2, 3, 4, 5] },
  { id: "CASE_EMPLOY", label: "IEPF-5 and RTA nodal verification", steps: [6] },
  { id: "CASE_REALIZE", label: "Demat credit", steps: [7] },
] as const;
export type CaseColumnId = (typeof CASE_COLUMNS)[number]["id"];

/** The step a converted lead starts at, from how far the conversation got. */
const STEP_FOR_STAGE: Record<CrmStage, number> = {
  NEW_SEARCH_LEAD: 1,
  RING_UP_DONE: 2,
  EVALUATION_IN_PROGRESS: 2,
  FEASIBILITY_CHECKED: 4,
  OFFER_SENT: 5,
  CONVERTED_TO_CASE: 5,
};

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async team() {
    return this.prisma.client.user.findMany({
      where: { role: { in: ["VALUATION_ANALYST", "LEGAL_OPS_EXEC"] }, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }

  async board(opts: { mine?: boolean; user: SessionClaims }) {
    const db = this.prisma.client;
    const leads = await db.leadInquiry.findMany({
      where: {
        crmStage: { not: "CONVERTED_TO_CASE" },
        ...(opts.mine ? { assignedAnalystId: opts.user.sub } : {}),
      },
      include: {
        assignedAnalyst: { select: { id: true, name: true } },
        associate: { select: { firmName: true, referralCode: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    const folioIds = [...new Set(leads.flatMap((l) => l.matchedFolioIds))];
    const folios = new Map(
      (
        await db.unclaimedFolio.findMany({
          where: { id: { in: folioIds } },
          select: {
            id: true,
            investorFullName: true,
            custodyStatus: true,
            postActionShares: true,
            company: { select: { name: true } },
          },
        })
      ).map((f) => [f.id, f]),
    );
    const cases = await db.recoveryCase.findMany({
      where: opts.mine ? { lead: { assignedAnalystId: opts.user.sub } } : {},
      include: {
        client: { select: { name: true } },
        company: { select: { name: true } },
        associate: { select: { firmName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    const leadColumns = CRM_STAGES.filter((s) => s !== "CONVERTED_TO_CASE").map((stage) => ({
      id: stage as string,
      label: CRM_STAGE_LABELS[stage],
      kind: "lead" as const,
      items: leads
        .filter((l) => l.crmStage === stage)
        .map((l) => ({
          type: "lead" as const,
          id: l.id,
          claimantName: l.claimantName,
          phone: l.phone,
          phoneMasked: maskPhone(l.phone),
          phoneVerified: l.phoneOtpVerified,
          relationship: RELATIONSHIP_LABELS[l.relationshipToHolder],
          certificates: PHYSICAL_CERT_LABELS[l.physicalCertStatus],
          estimatedValuePaise: Number(l.estimatedValuePaise),
          holdings: l.matchedFolioIds.flatMap((id) => {
            const f = folios.get(id);
            return f
              ? [
                  {
                    folioId: f.id,
                    holder: f.investorFullName,
                    company: f.company.name,
                    shares: f.postActionShares,
                    custody: CUSTODY_LABELS[f.custodyStatus],
                    folioReleased: l.releasedFolioIds.includes(f.id),
                  },
                ]
              : [];
          }),
          assignedAnalyst: l.assignedAnalyst,
          associate: l.associate,
          notes: l.notes,
          stage: l.crmStage,
          unlockedAt: isoTime(l.unlockedAt),
          updatedAt: isoTime(l.updatedAt),
        })),
    }));
    const caseColumns = CASE_COLUMNS.map((col) => ({
      id: col.id as string,
      label: col.label,
      kind: "case" as const,
      items: cases
        .filter((c) => (col.steps as readonly number[]).includes(c.recoverStep))
        .map((c) => ({
          type: "case" as const,
          id: c.id,
          caseCode: c.caseCode,
          clientName: c.client.name,
          companyName: c.company.name,
          recoverStep: c.recoverStep,
          recoverStepName: RECOVER_STEPS[c.recoverStep - 1]!.name,
          esignStatus: c.esignStatus,
          mcaIepf5Srn: c.mcaIepf5Srn,
          feePct: c.agreedSuccessFeePct === null ? null : num(c.agreedSuccessFeePct),
          folioReleased: !!c.folioReleasedAt,
          rtaEntitlementStatus: c.rtaEntitlementStatus,
          nodalVerificationStatus: c.nodalVerificationStatus,
          dematCreditStatus: c.dematCreditStatus,
          associate: c.associate,
          updatedAt: isoTime(c.updatedAt),
        })),
    }));
    return { columns: [...leadColumns, ...caseColumns] };
  }

  private async lead(id: string) {
    const lead = await this.prisma.client.leadInquiry.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException("No such lead.");
    return lead;
  }

  async update(
    id: string,
    user: SessionClaims,
    patch: { crmStage?: CrmStage; assignedAnalystId?: string | null; notes?: string },
  ) {
    const lead = await this.lead(id);
    if (lead.crmStage === "CONVERTED_TO_CASE")
      throw new ConflictException("This lead is already a case; work it on the case.");
    if (patch.crmStage === "CONVERTED_TO_CASE")
      throw new BadRequestException("Use Convert to open a case.");
    if (patch.assignedAnalystId) {
      const analyst = await this.prisma.client.user.findFirst({
        where: {
          id: patch.assignedAnalystId,
          role: { in: ["VALUATION_ANALYST", "LEGAL_OPS_EXEC", "SUPER_ADMIN"] },
        },
      });
      if (!analyst) throw new BadRequestException("That person is not on the case team.");
    }
    const updated = await this.prisma.client.leadInquiry.update({
      where: { id },
      data: {
        crmStage: patch.crmStage,
        assignedAnalystId:
          patch.assignedAnalystId === undefined ? undefined : patch.assignedAnalystId,
        notes: patch.notes,
      },
    });
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "lead.update",
      entityType: "lead",
      entityId: id,
      data: { from: lead.crmStage, ...patch },
    });
    return {
      id: updated.id,
      crmStage: updated.crmStage,
      assignedAnalystId: updated.assignedAnalystId,
      notes: updated.notes,
    };
  }

  /** Releases folio numbers to the claimant; everything not released stays masked for them. */
  async releaseFolios(id: string, user: SessionClaims, folioIds: string[]) {
    const lead = await this.lead(id);
    const unknown = folioIds.filter((f) => !lead.matchedFolioIds.includes(f));
    if (unknown.length) throw new BadRequestException("Release only holdings on this lead.");
    const released = [...new Set([...lead.releasedFolioIds, ...folioIds])];
    await this.prisma.client.leadInquiry.update({
      where: { id },
      data: { releasedFolioIds: released },
    });
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "lead.folio.release",
      entityType: "lead",
      entityId: id,
      data: { folioIds },
    });
    return { id, releasedFolioIds: released };
  }

  private async nextCaseCode(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getUTCFullYear();
    const last = await tx.recoveryCase.findFirst({
      where: { caseCode: { startsWith: `RC-${year}-` } },
      orderBy: { caseCode: "desc" },
      select: { caseCode: true },
    });
    const n = last ? Number(last.caseCode.split("-")[2]) + 1 : 1001;
    return `RC-${year}-${String(n).padStart(4, "0")}`;
  }

  async convert(
    id: string,
    user: SessionClaims,
    body: { folioId: string; scenarioType: ScenarioType; agreedSuccessFeePct?: number | null },
  ) {
    const lead = await this.lead(id);
    if (lead.crmStage === "CONVERTED_TO_CASE")
      throw new ConflictException("This lead is already a case.");
    if (!lead.phoneOtpVerified)
      throw new ConflictException("Verify the claimant's phone before opening a case.");
    if (!lead.matchedFolioIds.includes(body.folioId))
      throw new BadRequestException("Pick one of the holdings on this lead.");
    const db = this.prisma.client;
    const folio = await db.unclaimedFolio.findUniqueOrThrow({ where: { id: body.folioId } });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const created = await db.$transaction(async (tx) => {
          const client = await tx.user.upsert({
            where: { phone: lead.phone },
            update: {},
            create: {
              phone: lead.phone,
              name: lead.claimantName,
              email: lead.email,
              role: "INVESTOR",
            },
          });
          const c = await tx.recoveryCase.create({
            data: {
              caseCode: await this.nextCaseCode(tx),
              clientUserId: client.id,
              associateId: lead.associateId,
              companyId: folio.companyId,
              folioId: folio.id,
              scenarioType: body.scenarioType,
              recoverStep: STEP_FOR_STAGE[lead.crmStage],
              agreedSuccessFeePct: body.agreedSuccessFeePct ?? null,
              folioReleasedAt: lead.releasedFolioIds.includes(folio.id) ? new Date() : null,
            },
          });
          await tx.leadInquiry.update({
            where: { id },
            data: { crmStage: "CONVERTED_TO_CASE", convertedCaseId: c.id },
          });
          if (lead.associateId)
            await tx.associate.update({
              where: { id: lead.associateId },
              data: { totalReferredCases: { increment: 1 } },
            });
          await tx.caseEvent.create({
            data: {
              caseId: c.id,
              actorId: user.sub,
              kind: "created",
              message: `Case opened from a search lead at step ${c.recoverStep}.`,
            },
          });
          return c;
        });
        await this.audit.record({
          actorId: user.sub,
          actorRole: user.role,
          action: "lead.convert",
          entityType: "case",
          entityId: created.id,
          data: { leadId: id },
        });
        return {
          caseCode: created.caseCode,
          recoverStep: created.recoverStep,
          agreedSuccessFeePct:
            created.agreedSuccessFeePct === null ? null : num(created.agreedSuccessFeePct),
        };
      } catch (e) {
        // Two conversions raced for the same case code: take the next one.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 2)
          continue;
        throw e;
      }
    }
    throw new ConflictException("Could not allocate a case code. Try again.");
  }
}
