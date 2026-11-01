import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { decryptField, type Prisma } from "@recoveryos/db";
import type { IndianState } from "@recoveryos/shared";
import {
  holdingValuePaise,
  maskCompanyName,
  maskPincode,
  resolveSearch,
  STAFF_ROLES,
  VALUATION_BASIS,
  type ClaimRequestBody,
  type ClaimResponse,
  type ResultAccess,
  type SearchInput,
  type SearchResponse,
  type SearchResultItem,
} from "@recoveryos/shared";

import { ENV, type Env } from "../../config/env.js";
import { AuditService } from "../../common/audit.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { JobQueueService } from "../../common/queue/job-queue.service.js";
import { num } from "../../common/serialize.js";
import { LiveMcaSyncService } from "./live-mca-sync.service.js";
import { SEARCH_ENGINE } from "./search.tokens.js";
import type { SearchEngine, SearchHit } from "./search-engine.js";

type FolioWithCompany = Prisma.UnclaimedFolioGetPayload<{ include: { company: true } }>;

const RESULT_LIMIT = 50;

/** Folio lookups by (state, ids); hits without a state (Meilisearch) fall back to id only. */
function byState(hits: SearchHit[]): Prisma.UnclaimedFolioWhereInput[] {
  const groups = new Map<string, string[]>();
  for (const h of hits) groups.set(h.state ?? "", [...(groups.get(h.state ?? "") ?? []), h.id]);
  const where = [...groups].map(([state, ids]) =>
    state ? { state: state as IndianState, id: { in: ids } } : { id: { in: ids } },
  );
  return where.length ? where : [{ id: { in: [] } }];
}
const MAX_CLAIM_FOLIOS = 10;

export function estimateValuePaise(f: FolioWithCompany): number {
  return (
    holdingValuePaise(f.postActionShares, num(f.company.currentMarketPrice)) +
    Math.round(num(f.unclaimedDividendAmount) * 100)
  );
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveMcaSyncService,
    private readonly audit: AuditService,
    private readonly jobs: JobQueueService,
    @Inject(SEARCH_ENGINE) private readonly engine: SearchEngine,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private item(
    f: FolioWithCompany,
    hit: SearchHit,
    access: ResultAccess,
    released: Set<string>,
    matchedHolder: "primary" | "joint",
  ): SearchResultItem {
    const open = access !== "public";
    const folioReleased = access === "staff" || released.has(f.id);
    const price = f.company.currentMarketPrice;
    return {
      id: f.id,
      access,
      investorFullName: f.investorFullName,
      fatherOrSpouseName: f.fatherOrSpouseName,
      city: f.city,
      pincodeMasked: maskPincode(f.pincode),
      investorClusterId: f.investorClusterId,
      state: f.state,
      custodyStatus: f.custodyStatus,
      companyName: open ? f.company.name : maskCompanyName(f.company.name),
      companySlug: open ? f.company.slug : null,
      folioNumber: folioReleased
        ? decryptField(f.folioNumber, this.prisma.fieldKeys)
        : f.folioNumberMasked,
      folioReleased,
      postActionShares: open ? f.postActionShares : null,
      estimatedTotalValuePaise: open ? estimateValuePaise(f) : null,
      sharePricePaise: open && price !== null ? Math.round(num(price) * 100) : null,
      priceUpdatedAt:
        open && f.company.priceUpdatedAt ? f.company.priceUpdatedAt.toISOString() : null,
      unclaimedDividendPaise: open ? Math.round(num(f.unclaimedDividendAmount) * 100) : null,
      eventDate: f.eventDate ? f.eventDate.toISOString().slice(0, 10) : null,
      investmentType: f.investmentType,
      transferFinancialYear: f.transferFinancialYear,
      matchedHolder,
      matchScore: hit.score,
      matchedBy: hit.matchedBy,
    };
  }

  /** Folio ids released to this person: by an analyst, or by a signed mandate. */
  private async releasedFor(userId: string): Promise<Set<string>> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user) return new Set();
    const [leads, cases] = await Promise.all([
      this.prisma.client.leadInquiry.findMany({
        where: { phone: user.phone },
        select: { releasedFolioIds: true },
      }),
      // Released on a case: by an analyst, or by signing the Digital Mandate.
      this.prisma.client.recoveryCase.findMany({
        where: { clientUserId: userId, folioReleasedAt: { not: null }, folioId: { not: null } },
        select: { folioId: true },
      }),
    ]);
    return new Set([...leads.flatMap((l) => l.releasedFolioIds), ...cases.map((c) => c.folioId!)]);
  }

  /**
   * The 3-Minute Check. Everyone sees who matched and where; signed-in
   * members also see the company, shares and value; folio numbers stay
   * masked until an analyst releases them. Staff see everything.
   */
  async search(
    input: SearchInput,
    viewer: { user?: SessionClaims | null; ip?: string | null },
  ): Promise<SearchResponse> {
    const started = performance.now();
    const q = resolveSearch(input);
    if (!q) throw new BadRequestException("Enter the investor's name.");
    const joint = input.jointHolderName
      ? resolveSearch({ fullName: input.jointHolderName, state: input.state })
      : null;
    const user = viewer.user ?? null;
    const access: ResultAccess = !user
      ? "public"
      : (STAFF_ROLES as readonly string[]).includes(user.role)
        ? "staff"
        : "member";

    if (access === "member") {
      const today = await this.prisma.client.auditEvent.count({
        where: {
          actorId: user!.sub,
          action: "search.member",
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
      });
      if (today >= this.env.MEMBER_SEARCHES_PER_DAY)
        throw new HttpException(
          "You have run the most checks allowed today. Your analyst will continue from here.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
    }

    const [primaryHits, jointHits] = await Promise.all([
      this.engine.search(q, RESULT_LIMIT),
      joint ? this.engine.search(joint, RESULT_LIMIT) : Promise.resolve([]),
    ]);
    const hits = new Map<string, { hit: SearchHit; holder: "primary" | "joint" }>();
    for (const h of primaryHits) hits.set(h.id, { hit: h, holder: "primary" });
    for (const h of jointHits) if (!hits.has(h.id)) hits.set(h.id, { hit: h, holder: "joint" });

    const folios = await this.prisma.client.unclaimedFolio.findMany({
      // Grouped by state, so Postgres prunes to the partitions that matched.
      where: { OR: byState([...hits.values()].map((h) => h.hit)) },
      include: { company: true },
    });
    const byId = new Map(folios.map((f) => [f.id, f]));
    const released = access === "member" ? await this.releasedFor(user!.sub) : new Set<string>();
    const results = [...hits.values()].flatMap(({ hit, holder }) => {
      const f = byId.get(hit.id);
      return f ? [this.item(f, hit, access, released, holder)] : [];
    });
    if (access === "member")
      await this.audit.record({
        actorId: user!.sub,
        actorRole: user!.role,
        action: "search.member",
        entityType: "search",
        entityId: null,
        data: { state: q.state, matches: results.length, joint: !!joint },
        ip: viewer.ip ?? null,
      });
    return {
      mode: q.mode,
      query: {
        first: q.first,
        middle: q.middle,
        last: q.last,
        state: q.state,
        jointHolder: joint ? [joint.first, joint.middle, joint.last].filter(Boolean).join(" ") : "",
      },
      access,
      total: results.length,
      results,
      valuationBasis: VALUATION_BASIS,
      engine: this.engine.name,
      tookMs: Math.round(performance.now() - started),
      liveRefreshId: this.live.trigger(q.state),
    };
  }

  /** A signed-in member asks Finsol to take up the holdings they picked. */
  async claim(
    body: ClaimRequestBody,
    claims: SessionClaims,
    ip: string | null,
  ): Promise<ClaimResponse> {
    const folioIds = [...new Set(body.folioIds)];
    if (!folioIds.length || folioIds.length > MAX_CLAIM_FOLIOS)
      throw new BadRequestException(`Choose between 1 and ${MAX_CLAIM_FOLIOS} holdings.`);
    const db = this.prisma.client;
    const user = await db.user.findUniqueOrThrow({ where: { id: claims.sub } });
    const folios = await db.unclaimedFolio.findMany({
      where: { id: { in: folioIds } },
      include: { company: true },
    });
    if (folios.length !== folioIds.length)
      throw new BadRequestException("Some of those holdings no longer exist. Run the check again.");

    const associate = body.referralCode
      ? await db.associate.findUnique({
          where: { referralCode: body.referralCode.trim().toUpperCase() },
          select: { id: true },
        })
      : null;
    const estimate = folios.reduce((s, f) => s + estimateValuePaise(f), 0);
    const now = new Date();
    // Never mix claimants: a holding another client already has a case on, or
    // that another person has asked for, is flagged for an analyst to review.
    const [contestedCases, contestedLeads] = await Promise.all([
      db.recoveryCase.findMany({
        where: { folioId: { in: folioIds }, clientUserId: { not: user.id } },
        select: { caseCode: true, folioId: true },
      }),
      db.leadInquiry.findMany({
        where: {
          phone: { not: user.phone },
          matchedFolioIds: { hasSome: folioIds },
          crmStage: { not: "CONVERTED_TO_CASE" },
        },
        select: { id: true },
      }),
    ]);
    const reviewAlert =
      contestedCases.length || contestedLeads.length ? "DUPLICATE_CLAIMANT_REVIEW" : null;
    const existing = await db.leadInquiry.findFirst({
      where: {
        phone: user.phone,
        crmStage: { not: "CONVERTED_TO_CASE" },
        createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      orderBy: { createdAt: "desc" },
    });
    const lead = existing
      ? await db.leadInquiry.update({
          where: { id: existing.id },
          data: {
            claimantName: user.name,
            email: user.email ?? existing.email,
            relationshipToHolder: body.relationshipToHolder,
            physicalCertStatus: body.physicalCertStatus,
            phoneOtpVerified: true,
            matchedFolioIds: [...new Set([...existing.matchedFolioIds, ...folioIds])],
            unlockedAt: now,
            estimatedValuePaise: BigInt(Math.max(Number(existing.estimatedValuePaise), estimate)),
            associateId: existing.associateId ?? associate?.id ?? null,
            reviewAlert: reviewAlert ?? existing.reviewAlert,
          },
        })
      : await db.leadInquiry.create({
          data: {
            claimantName: user.name,
            phone: user.phone,
            phoneOtpVerified: true,
            email: user.email,
            relationshipToHolder: body.relationshipToHolder,
            physicalCertStatus: body.physicalCertStatus,
            matchedFolioIds: folioIds,
            unlockedAt: now,
            assignedAnalystId: await this.pickAnalyst(),
            estimatedValuePaise: BigInt(estimate),
            associateId: associate?.id ?? null,
            reviewAlert,
            searchContext: {
              folios: folios.map((f) => ({ last: f.lastNameNorm, state: f.state })),
            },
          },
        });
    await this.audit.record({
      actorId: user.id,
      actorRole: user.role,
      action: "search.claim",
      entityType: "lead",
      entityId: lead.id,
      data: { folioIds, relationship: body.relationshipToHolder },
      ip,
    });
    if (reviewAlert)
      await this.audit.record({
        actorId: user.id,
        actorRole: user.role,
        action: "lead.duplicate_claimant",
        entityType: "lead",
        entityId: lead.id,
        data: {
          folioIds,
          otherCases: contestedCases.map((c) => c.caseCode),
          otherLeads: contestedLeads.map((l) => l.id),
        },
        ip,
      });
    await this.jobs.enqueue("lead.notify-analyst", { leadId: lead.id });
    return {
      leadId: lead.id,
      folioCount: lead.matchedFolioIds.length,
      underReview: !!lead.reviewAlert,
    };
  }

  /** The valuation analyst with the fewest open leads. */
  private async pickAnalyst(): Promise<string | null> {
    const analysts = await this.prisma.client.user.findMany({
      where: { role: "VALUATION_ANALYST", isActive: true },
      select: {
        id: true,
        _count: {
          select: { assignedLeads: { where: { crmStage: { not: "CONVERTED_TO_CASE" } } } },
        },
      },
    });
    analysts.sort(
      (a, b) => a._count.assignedLeads - b._count.assignedLeads || a.id.localeCompare(b.id),
    );
    return analysts[0]?.id ?? null;
  }
}
