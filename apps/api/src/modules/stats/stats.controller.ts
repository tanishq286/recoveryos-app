import { Controller, Get } from "@nestjs/common";
import { holdingValuePaise } from "@recoveryos/shared";

import { Public } from "../../common/auth/decorators.js";
import { PrismaService } from "../../common/prisma.service.js";
import { num } from "../../common/serialize.js";

interface Stats {
  folios: number;
  companies: number;
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
    const [folios, companies, states, perCompany, activeCases, creditedCases, verifiedAssociates] =
      await Promise.all([
        db.unclaimedFolio.count(),
        db.company.count(),
        db.unclaimedFolio.groupBy({ by: ["state"] }).then((g) => g.length),
        db.unclaimedFolio.groupBy({
          by: ["companyId"],
          _sum: { postActionShares: true, unclaimedDividendAmount: true },
        }),
        db.recoveryCase.count({ where: { recoverStep: { lt: 7 } } }),
        db.recoveryCase.count({ where: { dematCreditStatus: "DONE" } }),
        db.associate.count({ where: { isVerified: true } }),
      ]);
    const prices = new Map(
      (await db.company.findMany({ select: { id: true, currentMarketPrice: true } })).map((c) => [
        c.id,
        num(c.currentMarketPrice),
      ]),
    );
    const estimatedValuePaise = perCompany.reduce(
      (s, g) =>
        s +
        holdingValuePaise(g._sum.postActionShares ?? 0, prices.get(g.companyId) ?? 0) +
        Math.round(num(g._sum.unclaimedDividendAmount) * 100),
      0,
    );
    const value: Stats = {
      folios,
      companies,
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
