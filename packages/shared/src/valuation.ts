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
  currentShares: number;
  growthMultiple: number;
  marketValuePaise: number;
  /** Dividends paid on the holding since purchase, if never encashed. */
  dividendPaise: number;
  totalPaise: number;
}

export const MIN_PURCHASE_YEAR = 1980;

/** Shares today, market value and dividends since purchase, from real event history. */
export function valueHolding(
  input: HoldingInput,
  actions: readonly CorporateActionLike[],
  dividends: readonly { exDate: string; amount: number }[],
): HoldingValuation {
  const heldFrom = `${input.purchaseYear}-01-01`;
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
  const events = shareActions.filter((a) => a.exDate >= heldFrom).length;
  const marketValuePaise =
    input.pricePerShare === null ? 0 : holdingValuePaise(r.shares, input.pricePerShare);
  return {
    ...input,
    heldFrom,
    events,
    currentShares: r.shares,
    growthMultiple: input.originalShares > 0 ? r.shares / input.originalShares : 0,
    marketValuePaise,
    dividendPaise: r.dividendPaise,
    totalPaise: marketValuePaise + r.dividendPaise,
  };
}

export interface PortfolioTotals {
  totalPaise: number;
  marketValuePaise: number;
  dividendPaise: number;
  originalShares: number;
  currentShares: number;
  growthMultiple: number;
}

export function portfolioTotals(rows: readonly HoldingValuation[]): PortfolioTotals {
  const sum = (f: (r: HoldingValuation) => number) => rows.reduce((a, r) => a + f(r), 0);
  const originalShares = sum((r) => r.originalShares);
  const currentShares = sum((r) => r.currentShares);
  return {
    totalPaise: sum((r) => r.totalPaise),
    marketValuePaise: sum((r) => r.marketValuePaise),
    dividendPaise: sum((r) => r.dividendPaise),
    originalShares,
    currentShares,
    growthMultiple: originalShares ? currentShares / originalShares : 0,
  };
}
