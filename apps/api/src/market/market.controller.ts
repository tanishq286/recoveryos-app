import { Controller, Get, HttpCode, Post } from "@nestjs/common";

import { Public, Roles } from "../common/auth/decorators.js";
import { PrismaService } from "../common/prisma.service.js";
import { isoTime, numOrNull } from "../common/serialize.js";
import { MarketService } from "./market.service.js";

@Controller("market")
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly prisma: PrismaService,
  ) {}

  /** Every company's last synced price, source and time. */
  @Public()
  @Get("prices")
  async prices() {
    const rows = await this.prisma.client.company.findMany({
      select: { slug: true, name: true, tickerNse: true, currentMarketPrice: true, priceUpdatedAt: true, priceSource: true },
      orderBy: { name: "asc" },
    });
    return {
      lastRun: this.market.last,
      prices: rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        tickerNse: r.tickerNse,
        price: numOrNull(r.currentMarketPrice),
        updatedAt: isoTime(r.priceUpdatedAt),
        source: r.priceSource,
      })),
    };
  }

  /** Run a price sync now. */
  @Roles("SUPER_ADMIN")
  @Post("sync")
  @HttpCode(200)
  sync() {
    return this.market.syncAll();
  }
}
