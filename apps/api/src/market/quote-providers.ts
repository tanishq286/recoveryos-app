/**
 * Equity price sources. Requests identify the service honestly; there is no
 * browser impersonation or cookie replay. NSE's public API often refuses
 * automated clients (HTTP 401/403), in which case the next provider answers.
 */
export const MARKET_USER_AGENT =
  process.env.MARKET_USER_AGENT ?? "RecoveryOS-PriceSync/0.2 (+https://recoveryos.in/bot)";

export interface Quote {
  /** Rupees. */
  price: number;
  /** When the exchange last traded, if the source says. */
  tradedAt: Date | null;
  source: string;
}

export interface Listing {
  tickerNse: string | null;
  tickerBse: string | null;
}

export interface QuoteProvider {
  readonly name: string;
  quote(listing: Listing): Promise<Quote | null>;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

async function getJson(fetchImpl: FetchLike, url: string): Promise<unknown | null> {
  const res = await fetchImpl(url, {
    headers: { "user-agent": MARKET_USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) return null;
  return res.json();
}

/** NSE India's equity quote API. */
export class NseQuoteProvider implements QuoteProvider {
  readonly name = "NSE";
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async quote({ tickerNse }: Listing): Promise<Quote | null> {
    if (!tickerNse) return null;
    const body = (await getJson(
      this.fetchImpl,
      `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(tickerNse)}`,
    )) as {
      priceInfo?: { lastPrice?: number; close?: number };
      metadata?: { lastUpdateTime?: string };
    } | null;
    const price = body?.priceInfo?.lastPrice ?? body?.priceInfo?.close;
    if (!price || !Number.isFinite(price) || price <= 0) return null;
    const t = body?.metadata?.lastUpdateTime
      ? new Date(`${body.metadata.lastUpdateTime} GMT+0530`)
      : null;
    return { price, tradedAt: t && !Number.isNaN(t.getTime()) ? t : null, source: "NSE" };
  }
}

interface YahooChart {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number; regularMarketTime?: number; exchangeName?: string };
      events?: {
        dividends?: Record<string, { amount: number; date: number }>;
        splits?: Record<string, { date: number; numerator: number; denominator: number }>;
      };
    }[];
  };
}

/** Yahoo Finance's chart API, which republishes NSE (.NS) and BSE (.BO) prices. */
export class YahooChartProvider implements QuoteProvider {
  readonly name = "Yahoo Finance";
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  static symbols({ tickerNse, tickerBse }: Listing): { symbol: string; exchange: "NSE" | "BSE" }[] {
    return [
      ...(tickerNse ? [{ symbol: `${tickerNse}.NS`, exchange: "NSE" as const }] : []),
      ...(tickerBse ? [{ symbol: `${tickerBse}.BO`, exchange: "BSE" as const }] : []),
    ];
  }

  private async chart(symbol: string, query: string): Promise<YahooChart | null> {
    return (await getJson(
      this.fetchImpl,
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`,
    )) as YahooChart | null;
  }

  async quote(listing: Listing): Promise<Quote | null> {
    for (const { symbol, exchange } of YahooChartProvider.symbols(listing)) {
      const meta = (await this.chart(symbol, "interval=1d&range=5d"))?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      if (price && Number.isFinite(price) && price > 0) {
        return {
          price,
          tradedAt: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : null,
          source: `Yahoo Finance (${exchange})`,
        };
      }
    }
    return null;
  }

  /**
   * Cash dividends per share over the last `years`. Yahoo reports past
   * dividends adjusted for later splits and bonuses; they are scaled back by
   * Yahoo's own split ratios so each amount is what was paid per share held
   * on its ex-date.
   */
  async dividends(listing: Listing, years = 10): Promise<{ exDate: string; amount: number }[]> {
    const [first] = YahooChartProvider.symbols(listing);
    if (!first) return [];
    const result = (await this.chart(first.symbol, `interval=1mo&range=${years}y&events=div,split`))
      ?.chart?.result?.[0];
    const splits = Object.values(result?.events?.splits ?? {}).map((s) => ({
      date: s.date,
      factor: s.numerator / s.denominator,
    }));
    return Object.values(result?.events?.dividends ?? {})
      .filter((d) => d.amount > 0)
      .map((d) => {
        const later = splits.filter((s) => s.date > d.date).reduce((f, s) => f * s.factor, 1);
        const exDate = new Date((d.date + 5.5 * 3600) * 1000).toISOString().slice(0, 10);
        return { exDate, amount: Math.round(d.amount * later * 10_000) / 10_000 };
      })
      .sort((a, b) => a.exDate.localeCompare(b.exDate));
  }
}
