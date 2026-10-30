import { describe, expect, it } from "vitest";

import { NseQuoteProvider, YahooChartProvider } from "../src/market/quote-providers.js";

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );

describe("quote providers", () => {
  it("reads NSE's last price and identifies itself honestly", async () => {
    let seen: Headers | undefined;
    const nse = new NseQuoteProvider((_url, init) => {
      seen = new Headers(init?.headers);
      return json({
        priceInfo: { lastPrice: 1167.4 },
        metadata: { lastUpdateTime: "29-Oct-2026 15:30:00" },
      });
    });
    const q = await nse.quote({ tickerNse: "RELIANCE", tickerBse: "500325" });
    expect(q).toMatchObject({ price: 1167.4, source: "NSE" });
    expect(seen?.get("user-agent")).toContain("RecoveryOS-PriceSync");
    expect(seen?.get("cookie")).toBeNull();
  });

  it("returns nothing when NSE refuses the request", async () => {
    const nse = new NseQuoteProvider(() =>
      Promise.resolve(
        new Response("Access Denied", { status: 403, headers: { "content-type": "text/html" } }),
      ),
    );
    expect(await nse.quote({ tickerNse: "TCS", tickerBse: null })).toBeNull();
  });

  it("falls back from .NS to .BO on Yahoo Finance", async () => {
    const urls: string[] = [];
    const yahoo = new YahooChartProvider((url) => {
      urls.push(url);
      return url.includes(".NS")
        ? json({ chart: { result: null } })
        : json({
            chart: {
              result: [{ meta: { regularMarketPrice: 118065, regularMarketTime: 1_793_267_942 } }],
            },
          });
    });
    const q = await yahoo.quote({ tickerNse: "MRF", tickerBse: "500290" });
    expect(q).toMatchObject({ price: 118065, source: "Yahoo Finance (BSE)" });
    expect(urls.map((u) => decodeURIComponent(u).match(/chart\/([^?]+)/)?.[1])).toEqual([
      "MRF.NS",
      "500290.BO",
    ]);
  });

  it("scales split-adjusted dividends back to what was paid per share", async () => {
    const t = (d: string) => Date.parse(`${d}T03:45:00Z`) / 1000;
    const yahoo = new YahooChartProvider(() =>
      json({
        chart: {
          result: [
            {
              meta: { regularMarketPrice: 1167.4 },
              events: {
                dividends: {
                  a: { amount: 4.5, date: t("2023-08-21") },
                  b: { amount: 5.5, date: t("2025-08-14") },
                },
                splits: { s: { date: t("2024-10-28"), numerator: 2, denominator: 1 } },
              },
            },
          ],
        },
      }),
    );
    expect(await yahoo.dividends({ tickerNse: "RELIANCE", tickerBse: null })).toEqual([
      { exDate: "2023-08-21", amount: 9 },
      { exDate: "2025-08-14", amount: 5.5 },
    ]);
  });
});
