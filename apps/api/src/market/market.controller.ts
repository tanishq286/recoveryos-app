import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";

import { Public, Roles } from "../common/auth/decorators.js";
import { PrismaService } from "../common/prisma.service.js";
import { isoTime, numOrNull } from "../common/serialize.js";
import { EquitiesService } from "./equities.service.js";
import { MarketService } from "./market.service.js";

@Controller("market")
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly prisma: PrismaService,
    private readonly equities: EquitiesService,
  ) {}

  /** The calculator's company picker: NSE-listed equities, plus BSE listings via live lookup. */
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get("equities")
  async searchEquities(
    @Query({ schema: z.object({ q: z.string().trim().max(60).default("") }) }) query: { q: string },
  ) {
    // Search first: on a fresh (serverless) instance it is what counts the directory.
    const results = await this.equities.search(query.q);
    return { directorySize: this.equities.directorySize, results };
  }

  /** One equity: live price, bonus and split history, and dividends paid per share. */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get("equities/:exchange/:symbol")
  equity(
    @Param("exchange", { schema: z.enum(["NSE", "BSE"]) }) exchange: "NSE" | "BSE",
    @Param("symbol", { schema: z.string().regex(/^[A-Za-z0-9&._-]{1,20}$/) }) symbol: string,
    @Query({ schema: z.object({ fresh: z.enum(["1"]).optional() }) }) query: { fresh?: "1" },
  ) {
    return this.equities.detail(symbol, exchange, { fresh: query.fresh === "1" });
  }

  /** Every company's last synced price, source and time. */
  @Public()
  @Get("prices")
  async prices() {
    const rows = await this.prisma.client.company.findMany({
      select: {
        slug: true,
        name: true,
        tickerNse: true,
        currentMarketPrice: true,
        priceUpdatedAt: true,
        priceSource: true,
      },
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
