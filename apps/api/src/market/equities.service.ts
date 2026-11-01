import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import {
  REFERENCE_COMPANIES,
  CALCULATOR_STOCKS,
  verifiedActionsFor,
  type CorporateActionLike,
} from "@finsol/shared";

import { ENV, type Env } from "../config/env.js";
import { PrismaService } from "../common/prisma.service.js";
import { num } from "../common/serialize.js";
import { MARKET_USER_AGENT, YahooChartProvider } from "./quote-providers.js";

export interface EquityListing {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  isin: string | null;
}

export interface EquityDetail extends EquityListing {
  price: number | null;
  priceUpdatedAt: string | null;
  priceSource: string | null;
  /** Bonuses and splits, oldest first. */
  actions: CorporateActionLike[];
  /** "verified": checked by hand against company filings; "exchange": the exchange split record. */
  actionsBasis: "verified" | "exchange";
  /** Cash dividends per share as paid on each ex-date (not adjusted), oldest first. */
  dividends: { exDate: string; amount: number }[];
}

/** NSE's published equity lists; the ISIN sits in a different column in each. */
const NSE_LISTS = [
  { url: "https://archives.nseindia.com/content/equities/EQUITY_L.csv", isinCol: 6 },
  { url: "https://archives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv", isinCol: 5 },
];
const DAY_MS = 86_400_000;
const DETAIL_TTL_MS = 15 * 60_000;

/**
 * The calculator's equity universe and per-stock history.
 * - Directory: every NSE main-board and SME equity, from NSE's published
 *   lists, stored in listed_equities (refreshed daily); BSE-only listings
 *   are found through Yahoo Finance's search.
 * - History: prices, bonus/split events and dividends from Yahoo Finance's
 *   chart API. Where a stock's history was verified by hand (the company
 *   catalogue and the calculator examples), those events replace the
 *   exchange record, which misses some combined bonus-and-split events.
 */
@Injectable()
export class EquitiesService implements OnApplicationBootstrap {
  private readonly log = new Logger("Equities");
  private size = 0;
  private loadedAt = 0;
  private readonly details = new Map<string, { at: number; value: EquityDetail }>();
  private readonly yahoo = new YahooChartProvider();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Network lookups follow the market sync switch, so tests stay offline. */
  private get online() {
    return this.env.MARKET_SYNC_ENABLED;
  }

  onApplicationBootstrap() {
    if (this.online && !this.env.SERVERLESS) void this.loadNse();
  }

  /** Reloads the NSE directory now (the serverless daily cron). Returns the directory size. */
  async refreshDirectory(): Promise<number> {
    if (this.online) await this.loadNse();
    return this.directorySize;
  }

  /**
   * Refreshes listed_equities from NSE's main-board and SME (Emerge) lists.
   * BSE refuses automated requests that identify themselves honestly, so
   * BSE-only listings come from Yahoo Finance's search at query time.
   */
  private async loadNse() {
    const rows: { symbol: string; name: string; isin: string | null; series: string }[] = [];
    for (const { url, isinCol } of NSE_LISTS) {
      try {
        const res = await fetch(url, {
          headers: { "user-agent": MARKET_USER_AGENT },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`answered ${res.status}`);
        for (const line of (await res.text()).trim().split(/\r?\n/).slice(1)) {
          const cells = line.split(",").map((c) => c.trim());
          const [symbol, name, series] = cells;
          if (symbol && name && series)
            rows.push({ symbol, name, series, isin: cells[isinCol] || null });
        }
      } catch (e) {
        this.log.warn(`NSE list ${url} unavailable: ${(e as Error).message}`);
      }
    }
    if (!rows.length) return;
    const db = this.prisma.client;
    await db.$transaction([
      db.listedEquity.deleteMany({ where: { exchange: "NSE" } }),
      db.listedEquity.createMany({
        data: rows.map((r) => ({ exchange: "NSE", ...r })),
        skipDuplicates: true,
      }),
    ]);
    this.loadedAt = Date.now();
    this.size = await db.listedEquity.count();
    this.log.log(`Loaded ${this.size} NSE equities (main board and SME).`);
  }

  /** Offline fallback: the stocks whose histories we hold. */
  private known(): EquityListing[] {
    return [
      ...REFERENCE_COMPANIES.filter((c) => c.tickerNse).map((c) => ({
        symbol: c.tickerNse!,
        name: c.name,
        exchange: "NSE" as const,
        isin: c.isin,
      })),
      ...CALCULATOR_STOCKS.map((c) => ({
        symbol: c.symbol,
        name: c.name,
        exchange: "NSE" as const,
        isin: null,
      })),
    ];
  }

  get directorySize(): number {
    return this.size || this.known().length;
  }

  private async fromDirectory(needle: string, limit: number): Promise<EquityListing[] | null> {
    if (!this.size) this.size = await this.prisma.client.listedEquity.count();
    if (!this.size) return null;
    const rows = await this.prisma.client.$queryRaw<
      { symbol: string; name: string; exchange: "NSE" | "BSE"; isin: string | null }[]
    >`
      SELECT symbol, name, exchange, isin FROM listed_equities
      WHERE ${needle} = '' OR upper(symbol) LIKE ${needle + "%"} OR name ILIKE ${"%" + needle + "%"}
         OR name % ${needle}
      ORDER BY (upper(symbol) = ${needle}) DESC, (upper(symbol) LIKE ${needle + "%"}) DESC,
               (upper(name) LIKE ${needle + "%"}) DESC, similarity(name, ${needle}) DESC, name
      LIMIT ${limit}`;
    return rows;
  }

  async search(q: string, limit = 12): Promise<EquityListing[]> {
    if (this.online && Date.now() - this.loadedAt > DAY_MS) await this.loadNse();
    const needle = q.trim().toUpperCase();
    const local = await this.fromDirectory(needle, limit);
    const scored =
      local ??
      this.known()
        .filter(
          (e) => !needle || e.symbol.includes(needle) || e.name.toUpperCase().includes(needle),
        )
        .slice(0, limit);
    if (scored.length >= limit || !this.online || !needle) return scored.slice(0, limit);
    // BSE-only listings: ask Yahoo Finance's search.
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`,
        { headers: { "user-agent": MARKET_USER_AGENT }, signal: AbortSignal.timeout(5000) },
      );
      const body = (await res.json()) as {
        quotes?: { symbol: string; longname?: string; shortname?: string; quoteType?: string }[];
      };
      const nseSymbols = new Set(scored.map((s) => s.symbol));
      const bse = (body.quotes ?? [])
        .filter((x) => x.quoteType === "EQUITY" && x.symbol.endsWith(".BO"))
        .map((x) => ({
          symbol: x.symbol.slice(0, -3),
          name: x.longname ?? x.shortname ?? x.symbol,
          exchange: "BSE" as const,
          isin: null,
        }))
        .filter((x) => !nseSymbols.has(x.symbol) && !scored.some((s) => s.name === x.name));
      return [...scored, ...bse].slice(0, limit);
    } catch {
      return scored.slice(0, limit);
    }
  }

  async detail(
    symbol: string,
    exchange: "NSE" | "BSE" = "NSE",
    opts: { fresh?: boolean } = {},
  ): Promise<EquityDetail> {
    const key = `${exchange}:${symbol.toUpperCase()}`;
    const cached = this.details.get(key);
    // "₹ Sync" asks for a fresh price, at most once a minute per stock.
    const ttl = opts.fresh ? 60_000 : DETAIL_TTL_MS;
    if (cached && Date.now() - cached.at < ttl) return cached.value;

    const verified = exchange === "NSE" ? verifiedActionsFor(symbol) : null;
    const company = await this.prisma.client.company.findFirst({
      where: exchange === "NSE" ? { tickerNse: symbol.toUpperCase() } : { tickerBse: symbol },
    });
    const listed = await this.prisma.client.listedEquity.findUnique({
      where: { exchange_symbol: { exchange, symbol: symbol.toUpperCase() } },
    });
    const listing = listed ?? this.known().find((e) => e.symbol === symbol.toUpperCase());

    const history = this.online
      ? await this.yahoo
          .history(`${symbol.toUpperCase()}.${exchange === "NSE" ? "NS" : "BO"}`)
          .catch(() => null)
      : null;
    if (!history && !verified && !company)
      throw new NotFoundException("We could not find that equity. Check the name or symbol.");

    const exchangeActions: CorporateActionLike[] = (history?.splits ?? []).map((s) => ({
      actionType: "SPLIT",
      exDate: s.exDate,
      ratioFrom: s.numerator,
      ratioTo: s.denominator,
      notes: `Shares × ${s.numerator / s.denominator} (bonus or split, exchange record)`,
      source: "Exchange split history (via Yahoo Finance)",
    }));
    const actions = verified?.actions ?? exchangeActions;

    // Yahoo scales past dividends down by its own later split ratios; scaling
    // back up by the same ratios gives what one share received on the day.
    const yahooFactorAfter = (date: string) =>
      (history?.splits ?? [])
        .filter((s) => s.exDate > date)
        .reduce((f, s) => f * (s.numerator / s.denominator), 1);
    const dividends = (history?.dividends ?? []).map((d) => ({
      exDate: d.exDate,
      amount: Math.round(d.adjustedAmount * yahooFactorAfter(d.exDate) * 10_000) / 10_000,
    }));

    const dbPrice = company?.currentMarketPrice ? num(company.currentMarketPrice) : null;
    const value: EquityDetail = {
      symbol: symbol.toUpperCase(),
      name: verified?.name ?? company?.name ?? listing?.name ?? history?.name ?? symbol,
      exchange,
      isin: listing?.isin ?? null,
      price: history?.price ?? dbPrice,
      priceUpdatedAt: history?.price
        ? (history.tradedAt ?? new Date()).toISOString()
        : (company?.priceUpdatedAt?.toISOString() ?? null),
      priceSource: history?.price
        ? `Yahoo Finance (${exchange})`
        : dbPrice !== null
          ? company!.priceSource
          : null,
      actions,
      actionsBasis: verified ? "verified" : "exchange",
      dividends,
    };
    this.details.set(key, { at: Date.now(), value });
    return value;
  }
}
