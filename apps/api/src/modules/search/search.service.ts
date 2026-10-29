import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { decryptField, type Prisma } from "@recoveryos/db";
import {
  holdingValuePaise,
  maskCompanyName,
  resolveSearch,
  RTA_LABELS,
  STAFF_ROLES,
  VALUATION_BASIS,
  type Role,
  type SearchInput,
  type SearchResponse,
  type SearchTeaser,
  type SearchUnlocked,
  type UnlockRequestBody,
  type UnlockResponse,
} from "@recoveryos/shared";

import { ENV, type Env } from "../../config/env.js";
import { AuditService } from "../../common/audit.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import { TokensService } from "../../common/auth/tokens.service.js";
import { JobQueueService } from "../../common/queue/job-queue.service.js";
import { num } from "../../common/serialize.js";
import { OtpService } from "../auth/otp.service.js";
import { SEARCH_ENGINE } from "./search.tokens.js";
import type { SearchEngine, SearchHit } from "./search-engine.js";

type FolioWithCompany = Prisma.UnclaimedFolioGetPayload<{ include: { company: true } }>;

const RESULT_LIMIT = 50;
const MAX_UNLOCK_FOLIOS = 10;

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
    private readonly tokens: TokensService,
    private readonly otp: OtpService,
    private readonly audit: AuditService,
    private readonly jobs: JobQueueService,
    @Inject(SEARCH_ENGINE) private readonly engine: SearchEngine,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private teaser(f: FolioWithCompany, hit: SearchHit): SearchTeaser {
    return {
      id: f.id,
      investorFullName: f.investorFullName,
      fatherOrSpouseName: f.fatherOrSpouseName,
      city: f.city,
      state: f.state,
      custodyStatus: f.custodyStatus,
      postActionShares: f.postActionShares,
      eventDate: f.eventDate ? f.eventDate.toISOString().slice(0, 10) : null,
      investmentType: f.investmentType,
      estimatedTotalValuePaise: estimateValuePaise(f),
      sharePricePaise: f.company.currentMarketPrice === null ? null : Math.round(num(f.company.currentMarketPrice) * 100),
      priceUpdatedAt: f.company.priceUpdatedAt ? f.company.priceUpdatedAt.toISOString() : null,
      companyName: maskCompanyName(f.company.name),
      folioNumber: f.folioNumberMasked,
      transferFinancialYear: f.transferFinancialYear,
      matchScore: hit.score,
      matchedBy: hit.matchedBy,
      unlocked: false,
    };
  }

  private unlocked(f: FolioWithCompany, hit: SearchHit): SearchUnlocked {
    return {
      ...this.teaser(f, hit),
      unlocked: true,
      companyName: f.company.name,
      companySlug: f.company.slug,
      folioNumber: decryptField(f.folioNumber, this.prisma.fieldKeys),
      rtaName: f.company.rtaName,
      rtaLabel: f.company.rtaDisplayName ?? RTA_LABELS[f.company.rtaName],
      certificateNumbers: f.certificateNumbers,
      unclaimedDividendPaise: Math.round(num(f.unclaimedDividendAmount) * 100),
      sourceFilingSrn: f.sourceFilingSrn,
    };
  }

  /** Public search. Masked unless the caller is staff or holds an unlock token for the row. */
  async search(
    input: SearchInput,
    opts: { unlockToken?: string | null; role?: Role | null },
  ): Promise<SearchResponse> {
    const started = performance.now();
    const q = resolveSearch(input);
    if (!q)
      throw new BadRequestException("Enter at least one name: first, middle, last or full name.");
    const hits = await this.engine.search(q, RESULT_LIMIT);
    const folios = await this.prisma.client.unclaimedFolio.findMany({
      where: { id: { in: hits.map((h) => h.id) } },
      include: { company: true },
    });
    const byId = new Map(folios.map((f) => [f.id, f]));
    const staff = !!opts.role && (STAFF_ROLES as readonly string[]).includes(opts.role);
    const claims = opts.unlockToken ? this.tokens.verifyUnlock(opts.unlockToken) : null;
    const allowed = new Set(claims?.fids ?? []);
    const results = hits.flatMap((h) => {
      const f = byId.get(h.id);
      if (!f) return [];
      return [staff || allowed.has(f.id) ? this.unlocked(f, h) : this.teaser(f, h)];
    });
    return {
      mode: q.mode,
      query: { first: q.first, middle: q.middle, last: q.last, state: q.state },
      total: results.length,
      results,
      valuationBasis: VALUATION_BASIS,
      engine: this.engine.name,
      tookMs: Math.round(performance.now() - started),
    };
  }

  /** Verifies the phone, records the lead, assigns an analyst and returns an unlock token. */
  async unlock(body: UnlockRequestBody, ip: string | null): Promise<UnlockResponse> {
    const folioIds = [...new Set(body.folioIds)];
    if (!folioIds.length || folioIds.length > MAX_UNLOCK_FOLIOS) {
      throw new BadRequestException(`Choose between 1 and ${MAX_UNLOCK_FOLIOS} results to unlock.`);
    }
    const phone = this.otp.phoneOrThrow(body.phone);
    const db = this.prisma.client;
    const usedToday = await db.otpChallenge.count({
      where: { phone, purpose: "UNLOCK", consumedAt: { gte: new Date(Date.now() - 86_400_000) } },
    });
    if (usedToday >= this.env.UNLOCKS_PER_PHONE_PER_DAY) {
      throw new HttpException(
        "This number has unlocked the most results allowed today. An analyst will call you.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.otp.verify(phone, "UNLOCK", body.otpCode);

    const folios = await db.unclaimedFolio.findMany({
      where: { id: { in: folioIds } },
      include: { company: true },
    });
    if (folios.length !== folioIds.length)
      throw new BadRequestException("Some of those results no longer exist. Search again.");

    const associate = body.referralCode
      ? await db.associate.findUnique({
          where: { referralCode: body.referralCode.trim().toUpperCase() },
          select: { id: true },
        })
      : null;
    const estimate = folios.reduce((s, f) => s + estimateValuePaise(f), 0);
    const now = new Date();

    const existing = await db.leadInquiry.findFirst({
      where: {
        phone,
        crmStage: { not: "CONVERTED_TO_CASE" },
        createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      orderBy: { createdAt: "desc" },
    });
    const lead = existing
      ? await db.leadInquiry.update({
          where: { id: existing.id },
          data: {
            claimantName: body.name,
            email: body.email ?? existing.email,
            relationshipToHolder: body.relationshipToHolder,
            physicalCertStatus: body.physicalCertStatus,
            phoneOtpVerified: true,
            matchedFolioIds: [...new Set([...existing.matchedFolioIds, ...folioIds])],
            unlockedAt: now,
            estimatedValuePaise: BigInt(Math.max(Number(existing.estimatedValuePaise), estimate)),
            associateId: existing.associateId ?? associate?.id ?? null,
          },
        })
      : await db.leadInquiry.create({
          data: {
            claimantName: body.name,
            phone,
            phoneOtpVerified: true,
            email: body.email ?? null,
            relationshipToHolder: body.relationshipToHolder,
            physicalCertStatus: body.physicalCertStatus,
            matchedFolioIds: folioIds,
            unlockedAt: now,
            assignedAnalystId: await this.pickAnalyst(),
            estimatedValuePaise: BigInt(estimate),
            associateId: associate?.id ?? null,
            searchContext: {
              folios: folios.map((f) => ({ last: f.lastNameNorm, state: f.state })),
            },
          },
        });

    await this.audit.record({
      action: "search.unlock",
      entityType: "lead",
      entityId: lead.id,
      data: { folioIds, phoneLast4: phone.slice(-4), relationship: body.relationshipToHolder },
      ip,
    });
    await this.jobs.enqueue("lead.notify-analyst", { leadId: lead.id });

    const unlock = this.tokens.signUnlock(lead.id, lead.matchedFolioIds);
    return {
      leadId: lead.id,
      unlockToken: unlock.token,
      expiresAt: unlock.expiresAt,
      results: folios.map((f) => this.unlocked(f, { id: f.id, score: 1, matchedBy: "exact" })),
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
