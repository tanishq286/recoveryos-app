import { Controller, Get } from "@nestjs/common";
import { holdingValuePaise } from "@finsol/shared";

import { Public } from "../../common/auth/decorators.js";
import { PrismaService } from "../../common/prisma.service.js";
import { num } from "../../common/serialize.js";

interface Stats {
  /** Searchable holder records (statement entries): not people, not unique folios. */
  folios: number;
  holderRecords: number;
  /** Distinct folio or demat numbers behind those records. */
  distinctFolios: number;
  /** Companies with at least one holder record. */
  companiesWithRecords: number;
  /** Company profiles in the directory, with or without holder records. */
  companies: number;
  companyProfiles: number;
  listedEquities: number;
  states: number;
  estimatedValuePaise: number;
  activeCases: number;
  creditedCases: number;
  verifiedAssociates: number;
  asOf: string;
}

/** Live counters for the home page. Cached for a minute. */
@Controller("stats")
export class StatsController {
  private cache: { at: number; value: Stats } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async stats(): Promise<Stats> {
    if (this.cache && Date.now() - this.cache.at < 60_000) return this.cache.value;
    const db = this.prisma.client;
    const published = { reviewStatus: "PUBLISHED" };
    const [
      folios,
      companies,
      states,
      perCompany,
      activeCases,
      creditedCases,
      verifiedAssociates,
      listedEquities,
      distinct,
    ] = await Promise.all([
      db.unclaimedFolio.count({ where: published }),
      db.company.count(),
      db.unclaimedFolio.groupBy({ by: ["state"], where: published }).then((g) => g.length),
      db.unclaimedFolio.groupBy({
        by: ["companyId"],
        where: published,
        _sum: { postActionShares: true, unclaimedDividendAmount: true },
      }),
      db.recoveryCase.count({ where: { recoverStep: { lt: 7 } } }),
      db.recoveryCase.count({ where: { dematCreditStatus: "DONE" } }),
      db.associate.count({ where: { isVerified: true } }),
      db.listedEquity.count(),
      db.$queryRaw<{ n: bigint }[]>`
          SELECT count(DISTINCT (company_id, folio_number_hash)) AS n
            FROM unclaimed_folios WHERE review_status = 'PUBLISHED'`,
    ]);
    const prices = new Map(
      (await db.company.findMany({ select: { id: true, currentMarketPrice: true } })).map((c) => [
        c.id,
        num(c.currentMarketPrice),
      ]),
    );
    // Shares are valued only where a price exists; amounts are as the statements list them.
    const estimatedValuePaise = perCompany.reduce(
      (s, g) =>
        s +
        holdingValuePaise(g._sum.postActionShares ?? 0, prices.get(g.companyId) ?? 0) +
        Math.round(num(g._sum.unclaimedDividendAmount) * 100),
      0,
    );
    const value: Stats = {
      folios,
      holderRecords: folios,
      distinctFolios: Number(distinct[0]?.n ?? 0),
      companiesWithRecords: perCompany.length,
      companies,
      companyProfiles: companies,
      listedEquities,
      states,
      estimatedValuePaise,
      activeCases,
      creditedCases,
      verifiedAssociates,
      asOf: new Date().toISOString(),
    };
    this.cache = { at: Date.now(), value };
    return value;
  }
}
