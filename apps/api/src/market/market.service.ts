import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { MARKET_SYNC_SOURCES } from "@recoveryos/db";

import { ENV, type Env } from "../config/env.js";
import { PrismaService } from "../common/prisma.service.js";
import { NseQuoteProvider, YahooChartProvider, type QuoteProvider } from "./quote-providers.js";

export const QUOTE_PROVIDERS = Symbol("QUOTE_PROVIDERS");
export const DIVIDEND_SOURCE = MARKET_SYNC_SOURCES[0];

export interface SyncReport {
  startedAt: string;
  finishedAt: string;
  updated: { slug: string; price: number; source: string }[];
  failed: string[];
}

/**
 * Keeps `companies.current_market_price` live: on start-up and every
 * MARKET_SYNC_INTERVAL_MINUTES (15 by default), NSE first, then Yahoo
 * Finance. A price is only ever written with its source and fetch time; a
 * failed fetch leaves the last real price in place rather than guessing.
 * Dividend history is refreshed once a day from Yahoo Finance.
 */
@Injectable()
export class MarketService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger("Market");
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<SyncReport> | null = null;
  private lastDividendSync = 0;
  last: SyncReport | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
    @Inject(QUOTE_PROVIDERS) private readonly providers: QuoteProvider[],
  ) {}

  onApplicationBootstrap() {
    if (!this.env.MARKET_SYNC_ENABLED) {
      this.log.log("Market sync is off (MARKET_SYNC_ENABLED=false).");
      return;
    }
    const tick = () => void this.syncAll().catch((e: Error) => this.log.error(`Sync failed: ${e.message}`));
    setTimeout(tick, 1_000).unref();
    this.timer = setInterval(tick, this.env.MARKET_SYNC_INTERVAL_MINUTES * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Prices for every listed company, then dividends if a day has passed. One run at a time. */
  async syncAll(): Promise<SyncReport> {
    this.running ??= this.syncPrices().finally(() => (this.running = null));
    const report = await this.running;
    if (Date.now() - this.lastDividendSync > 24 * 3_600_000) {
      this.lastDividendSync = Date.now();
      await this.syncDividends().catch((e: Error) => this.log.warn(`Dividend sync failed: ${e.message}`));
    }
    return report;
  }

  async syncPrices(): Promise<SyncReport> {
    const startedAt = new Date().toISOString();
    const db = this.prisma.client;
    const companies = await db.company.findMany({
      where: { OR: [{ tickerNse: { not: null } }, { tickerBse: { not: null } }] },
      select: { id: true, slug: true, tickerNse: true, tickerBse: true },
    });
    const updated: SyncReport["updated"] = [];
    const failed: string[] = [];
    for (const c of companies) {
      let done = false;
      for (const p of this.providers) {
        try {
          const q = await p.quote(c);
          if (!q) continue;
          await db.company.update({
            where: { id: c.id },
            data: { currentMarketPrice: q.price, priceUpdatedAt: new Date(), priceSource: q.source },
          });
          updated.push({ slug: c.slug, price: q.price, source: q.source });
          done = true;
          break;
        } catch {
          // Try the next provider.
        }
      }
      if (!done) failed.push(c.slug);
      // Be gentle with public endpoints.
      await new Promise((r) => setTimeout(r, this.env.NODE_ENV === "test" ? 0 : 300));
    }
    this.last = { startedAt, finishedAt: new Date().toISOString(), updated, failed };
    this.log.log(`Prices: ${updated.length} updated${failed.length ? `, no price for ${failed.join(", ")}` : ""}.`);
    return this.last;
  }

  /** Real cash dividends per share (last 10 years) as DIVIDEND corporate actions. */
  async syncDividends(): Promise<number> {
    const yahoo = this.providers.find((p): p is YahooChartProvider => p instanceof YahooChartProvider);
    if (!yahoo) return 0;
    const db = this.prisma.client;
    const companies = await db.company.findMany({ select: { id: true, tickerNse: true, tickerBse: true } });
    let written = 0;
    for (const c of companies) {
      const divs = await yahoo.dividends(c).catch(() => []);
      if (!divs.length) continue;
      await db.$transaction([
        db.corporateAction.deleteMany({ where: { companyId: c.id, actionType: "DIVIDEND", source: DIVIDEND_SOURCE } }),
        db.corporateAction.createMany({
          data: divs.map((d) => ({
            companyId: c.id,
            actionType: "DIVIDEND" as const,
            exDate: new Date(d.exDate),
            dividendPerShare: d.amount,
            notes: "Cash dividend per share",
            source: DIVIDEND_SOURCE,
          })),
          skipDuplicates: true,
        }),
      ]);
      written += divs.length;
      await new Promise((r) => setTimeout(r, this.env.NODE_ENV === "test" ? 0 : 300));
    }
    this.log.log(`Dividends: ${written} records refreshed.`);
    return written;
  }
}

export function defaultProviders(): QuoteProvider[] {
  return [new NseQuoteProvider(), new YahooChartProvider()];
}
