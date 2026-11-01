import { computeEntitlement, type CorporateActionLike } from "./corporate-actions.js";
import { holdingValuePaise } from "./fees.js";

/** One line of the multi-stock holding calculator. */
export interface HoldingInput {
  symbol: string;
  exchange: "NSE" | "BSE";
  name: string;
  /** 1980 to the current year. */
  purchaseYear: number;
  originalShares: number;
  /** Rupees per share today. */
  pricePerShare: number | null;
  /** True when the visitor typed the price instead of using the synced one. */
  priceIsManual: boolean;
}

export interface HoldingValuation extends HoldingInput {
  /** Holding is assumed from 1 January of the purchase year. */
  heldFrom: string;
  /** Bonus and split events applied. */
  events: number;
  /** Shares today if bought on 1 January of the purchase year (every event that year applies). */
  currentShares: number;
  /**
   * When events happened during the purchase year, the share count depends on
   * the purchase date: min (bought on 31 December) to max (bought on 1 January).
   */
  currentSharesRange: { min: number; max: number };
  /** Bonus/split events in the purchase year itself (the cause of the range). */
  purchaseYearEvents: number;
  growthMultiple: number;
  /** False when no corporate-action history was available: shares are not adjusted. */
  sharesAdjusted: boolean;
  /** Estimated market value; null when there is no price (never zero for unknown). */
  marketValuePaise: number | null;
  /**
   * Dividends declared while the shares were held, if every one went unpaid.
   * Historical figures, not a confirmed unpaid entitlement, and not in the estimate.
   */
  dividendPaise: number;
  /** The headline estimate: market value only. Null when the price is unknown. */
  totalPaise: number | null;
  /** Assumptions that apply to this line, in plain words. */
  assumptions: string[];
}

export const MIN_PURCHASE_YEAR = 1980;

/** Assumptions shown with every estimate, wherever it appears. */
export const VALUATION_ASSUMPTIONS = [
  "This is an estimate, not an official or certified valuation.",
  "Shares are assumed to have been held from 1 January of the purchase year.",
  "Bonuses and splits are applied in date order; fractional entitlements are left out, as companies pay cash for them.",
  "Mergers, demergers and cash-only events are not valued here; your analyst checks them.",
  "Dividends declared while the shares were held are shown separately and are not included: whether any went unpaid is confirmed only during verification.",
  "Prices come from market data that can be delayed; the value is fixed only when shares are credited.",
] as const;

/** Shares today, market value and dividends declared since purchase, from real event history. */
export function valueHolding(
  input: HoldingInput,
  actions: readonly CorporateActionLike[],
  dividends: readonly { exDate: string; amount: number }[],
  /** False when the stock's corporate-action history could not be loaded. */
  actionsKnown = true,
): HoldingValuation {
  const heldFrom = `${input.purchaseYear}-01-01`;
  const yearEnd = `${input.purchaseYear}-12-31`;
  const shareActions = actions.filter(
    (a) => a.actionType !== "DIVIDEND" && a.actionType !== "CASH_ENTITLEMENT",
  );
  const all: CorporateActionLike[] = [
    ...shareActions,
    ...dividends.map((d) => ({
      actionType: "DIVIDEND" as const,
      exDate: d.exDate,
      dividendPerShare: d.amount,
    })),
  ];
  const r = computeEntitlement(input.originalShares, all, { acquiredOn: heldFrom });
  const late = computeEntitlement(input.originalShares, shareActions, { acquiredOn: yearEnd });
  const events = shareActions.filter((a) => a.exDate >= heldFrom).length;
  const purchaseYearEvents = shareActions.filter(
    (a) => a.exDate >= heldFrom && a.exDate < yearEnd,
  ).length;
  const marketValuePaise =
    input.pricePerShare === null ? null : holdingValuePaise(r.shares, input.pricePerShare);
  const assumptions: string[] = [];
  if (!actionsKnown)
    assumptions.push(
      "No bonus or split history was available for this stock, so the share count is not adjusted.",
    );
  if (purchaseYearEvents)
    assumptions.push(
      `${purchaseYearEvents} bonus or split event${purchaseYearEvents > 1 ? "s" : ""} fell in ${input.purchaseYear}; depending on the purchase date you hold between ${late.shares.toLocaleString("en-IN")} and ${r.shares.toLocaleString("en-IN")} shares.`,
    );
  if (shareActions.some((a) => a.actionType === "MERGER" && a.exDate >= heldFrom))
    assumptions.push("A merger applies: the share count follows the swap ratio on record.");
  if (input.pricePerShare === null)
    assumptions.push("No price is available, so no value is estimated.");
  return {
    ...input,
    heldFrom,
    events,
    currentShares: r.shares,
    currentSharesRange: { min: late.shares, max: r.shares },
    purchaseYearEvents,
    growthMultiple: input.originalShares > 0 ? r.shares / input.originalShares : 0,
    sharesAdjusted: actionsKnown,
    marketValuePaise,
    dividendPaise: r.dividendPaise,
    totalPaise: marketValuePaise,
    assumptions,
  };
}

export interface PortfolioTotals {
  /** Sum of the lines with a known value. */
  totalPaise: number;
  marketValuePaise: number;
  /** Dividends declared while held (historical, not confirmed unpaid; not in totalPaise). */
  dividendPaise: number;
  originalShares: number;
  currentShares: number;
  growthMultiple: number;
  /** Lines whose value is unknown (no price). When above zero the total is incomplete. */
  unvaluedLines: number;
  complete: boolean;
}

export function portfolioTotals(rows: readonly HoldingValuation[]): PortfolioTotals {
  const sum = (f: (r: HoldingValuation) => number) => rows.reduce((a, r) => a + f(r), 0);
  const originalShares = sum((r) => r.originalShares);
  const currentShares = sum((r) => r.currentShares);
  const unvaluedLines = rows.filter((r) => r.totalPaise === null).length;
  return {
    totalPaise: sum((r) => r.totalPaise ?? 0),
    marketValuePaise: sum((r) => r.marketValuePaise ?? 0),
    dividendPaise: sum((r) => r.dividendPaise),
    originalShares,
    currentShares,
    growthMultiple: originalShares ? currentShares / originalShares : 0,
    unvaluedLines,
    complete: unvaluedLines === 0,
  };
}
