/**
 * Regression tests for the November 2026 audit: identity normalisation,
 * amount parsing, price labels and valuation semantics. Synthetic values only.
 */
import { describe, expect, it } from "vitest";
import {
  computeEntitlement,
  describeQuote,
  expandSingleWord,
  resolveSearch,
  isMarketHours,
  normalizeRelative,
  parseAmount,
  portfolioTotals,
  statusOf,
  valueHolding,
  type CorporateActionLike,
  type HoldingInput,
} from "../src/index.js";

describe("normalizeRelative", () => {
  it("removes a placeholder and keeps the real name, with a warning", () => {
    const r = normalizeRelative(["NA", "", "SHARMA"]);
    expect(r.value).toBe("SHARMA");
    expect(r.issues).toEqual(["RELATIVE_PLACEHOLDER_REMOVED"]);
    expect(statusOf(r.issues)).toBe("WARNING");
  });

  it("treats a placeholder-only relative as missing, never as text", () => {
    for (const p of [["NA"], ["N.A."], ["nil"], ["-"], ["‐"], ["NA", "", ""]]) {
      const r = normalizeRelative(p);
      expect(r.value).toBeNull();
      expect(r.issues).toContain("RELATIVE_MISSING");
    }
  });

  it("quarantines address text that leaked into the relative, without guessing", () => {
    for (const p of [
      ["NA", "", "C/O"],
      ["NA", "", "23,"],
      ["NA", "", "K ‐"],
      ["RAM", "", "12"],
    ]) {
      const r = normalizeRelative(p);
      expect(r.issues).toContain("RELATIVE_SUSPECT");
      expect(statusOf(r.issues)).toBe("QUARANTINED");
    }
  });

  it("keeps a clean relative untouched", () => {
    const r = normalizeRelative(["RAM", "KUMAR", "GUPTA"]);
    expect(r).toEqual({ value: "RAM KUMAR GUPTA", issues: [] });
  });

  it("reports a missing relative instead of inventing one", () => {
    expect(normalizeRelative([null, undefined, ""])).toEqual({
      value: null,
      issues: ["RELATIVE_MISSING"],
    });
  });
});

describe("parseAmount", () => {
  it("never concatenates two numbers (the old 1234.50 02 → 1234.5002 bug)", () => {
    expect(parseAmount("1234.50 02")).toEqual({ value: null, ambiguous: true });
    expect(parseAmount("750 02")).toEqual({ value: null, ambiguous: true });
  });

  it("reads plain and grouped amounts", () => {
    expect(parseAmount("1,234.50").value).toBe(1234.5);
    expect(parseAmount("Rs. 750").value).toBe(750);
    expect(parseAmount(42).value).toBe(42);
    expect(parseAmount("").value).toBe(0);
  });
});

describe("describeQuote", () => {
  // Friday 30 Oct 2026, 10:00 UTC = 15:30 IST (closed); 05:00 UTC = 10:30 IST (open).
  const closed = new Date("2026-10-30T10:00:00Z");
  const open = new Date("2026-10-30T05:00:00Z");
  const facts = {
    price: 1400,
    quoteAt: "2026-10-30T09:59:00Z",
    retrievedAt: "2026-10-30T10:00:00Z",
    source: "Yahoo Finance (NSE)",
  };

  it("never calls a price live", () => {
    for (const at of [open, closed]) {
      const d = describeQuote(facts, at);
      expect(`${d.label} ${d.detail}`.toLowerCase()).not.toContain("live");
    }
  });

  it("separates the quote time from the fetch time", () => {
    const d = describeQuote(facts, closed);
    expect(d.status).toBe("MARKET_CLOSED");
    expect(d.detail).toContain("quoted 30 Oct 2026, 15:29 IST");
    expect(d.detail).toContain("fetched 30 Oct 2026, 15:30 IST");
  });

  it("marks prices delayed during market hours", () => {
    expect(isMarketHours(open)).toBe(true);
    expect(describeQuote(facts, open).status).toBe("DELAYED");
  });

  it("keeps the last price but labels it stale after a failed refresh", () => {
    const d = describeQuote(
      { ...facts, attemptedAt: "2026-10-31T10:00:00Z", error: "timeout" },
      new Date("2026-10-31T10:01:00Z"),
    );
    expect(d.status).toBe("STALE");
    expect(d.label).toMatch(/last known/i);
  });

  it("is unavailable rather than zero without a price, and distinguishes manual prices", () => {
    expect(describeQuote({ ...facts, price: null }, closed).status).toBe("UNAVAILABLE");
    expect(describeQuote({ ...facts, manual: true }, closed).status).toBe("MANUAL");
  });
});

describe("valuation semantics", () => {
  const input: HoldingInput = {
    symbol: "TEST",
    exchange: "NSE",
    name: "Test Ltd",
    purchaseYear: 2010,
    originalShares: 100,
    pricePerShare: 100,
    priceIsManual: false,
  };
  const bonusMidYear: CorporateActionLike = {
    actionType: "BONUS",
    exDate: "2010-06-15",
    ratioFrom: 1,
    ratioTo: 1,
  };

  it("keeps an unknown price unknown instead of valuing it at zero", () => {
    const v = valueHolding({ ...input, pricePerShare: null }, [], []);
    expect(v.marketValuePaise).toBeNull();
    expect(v.totalPaise).toBeNull();
    const t = portfolioTotals([v, valueHolding(input, [], [])]);
    expect(t.complete).toBe(false);
    expect(t.unvaluedLines).toBe(1);
    expect(t.totalPaise).toBe(100 * 100 * 100);
  });

  it("does not add historical dividends into the estimate", () => {
    const v = valueHolding(input, [], [{ exDate: "2015-08-01", amount: 5 }]);
    expect(v.dividendPaise).toBe(100 * 5 * 100);
    expect(v.totalPaise).toBe(v.marketValuePaise);
  });

  it("shows the purchase-year range when an event fell in that year", () => {
    const v = valueHolding(input, [bonusMidYear], []);
    expect(v.currentSharesRange).toEqual({ min: 100, max: 200 });
    expect(v.purchaseYearEvents).toBe(1);
    expect(v.assumptions.join(" ")).toMatch(/between 100 and 200/);
  });

  it("flags missing corporate-action history instead of silently not adjusting", () => {
    const v = valueHolding(input, [], [], false);
    expect(v.sharesAdjusted).toBe(false);
    expect(v.assumptions.join(" ")).toMatch(/not adjusted/);
  });

  it("applies same-day split then bonus in a fixed order (Bajaj Finance 2016 pattern)", () => {
    const sameDay: CorporateActionLike[] = [
      { actionType: "BONUS", exDate: "2016-09-08", ratioFrom: 2, ratioTo: 1 },
      { actionType: "SPLIT", exDate: "2016-09-08", ratioFrom: 10, ratioTo: 2 },
    ];
    // 3 shares: split ×5 → 15, then bonus 1-for-2 → 15 + 7 = 22. Reversed order would give 20.
    expect(computeEntitlement(3, sameDay, { acquiredOn: "2016-01-01" }).shares).toBe(22);
    expect(computeEntitlement(3, [...sameDay].reverse(), { acquiredOn: "2016-01-01" }).shares).toBe(
      22,
    );
  });

  it("applies each event once (no double application)", () => {
    const actions: CorporateActionLike[] = [
      { actionType: "BONUS", exDate: "2011-01-01", ratioFrom: 1, ratioTo: 1 },
      { actionType: "SPLIT", exDate: "2012-01-01", ratioFrom: 10, ratioTo: 1 },
    ];
    expect(valueHolding(input, actions, []).currentShares).toBe(100 * 2 * 10);
  });
});

describe("single-word searches", () => {
  it("search a lone word as surname, first and middle name (the 'Agarwal' bug)", () => {
    const q = resolveSearch({ fullName: "Agarwal", state: "ALL_INDIA" })!;
    expect(q.singleWord).toBe(true);
    const parts = expandSingleWord(q);
    expect(parts.map((p) => p.mode)).toEqual(["LAST", "FIRST", "MIDDLE"]);
    expect(parts[0]).toMatchObject({ last: "AGARWAL", first: "", middle: "" });
  });

  it("leave multi-word and explicit-part searches alone", () => {
    expect(
      expandSingleWord(resolveSearch({ fullName: "Ramesh Agarwal", state: "DELHI" })!),
    ).toHaveLength(1);
    expect(expandSingleWord(resolveSearch({ lastName: "Agarwal", state: "DELHI" })!)).toHaveLength(
      1,
    );
    expect(resolveSearch({ fullName: "A", state: "DELHI" })!.singleWord).toBeUndefined();
  });
});
