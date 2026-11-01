import type { CorporateActionLike } from "../corporate-actions.js";
import { REFERENCE_COMPANIES } from "./companies.js";

/**
 * Bonus and split histories for stocks the calculator offers as one-click
 * examples but that are not in the company catalogue. Each was checked
 * against more than one source, because the exchange split history Yahoo
 * Finance republishes misses some combined events (Torrent Pharma's 2006
 * split plus bonus appears there only as a 2:1).
 */
export interface CalculatorStock {
  symbol: string;
  name: string;
  tickerNse: string;
  tickerBse: string | null;
  actions: CorporateActionLike[];
}

const VERIFIED = "Company filings, cross-checked with exchange records";

const bonus = (exDate: string, from: number, to: number, notes?: string): CorporateActionLike => ({
  actionType: "BONUS",
  exDate,
  ratioFrom: from,
  ratioTo: to,
  notes: notes ?? `Bonus ${to}:${from}`,
  source: VERIFIED,
});
const split = (exDate: string, from: number, to: number): CorporateActionLike => ({
  actionType: "SPLIT",
  exDate,
  ratioFrom: from,
  ratioTo: to,
  notes: `Face value ₹${from} to ₹${to}`,
  source: VERIFIED,
});

export const CALCULATOR_STOCKS: CalculatorStock[] = [
  {
    symbol: "TORNTPHARM",
    name: "Torrent Pharmaceuticals Limited",
    tickerNse: "TORNTPHARM",
    tickerBse: "500420",
    actions: [
      split("2006-02-20", 10, 5),
      bonus("2006-02-20", 1, 1, "Bonus 1:1 on the post-split shares"),
      bonus("2013-07-23", 1, 1),
      bonus("2022-07-08", 1, 1),
    ],
  },
  {
    symbol: "EICHERMOT",
    name: "Eicher Motors Limited",
    tickerNse: "EICHERMOT",
    tickerBse: "505200",
    actions: [split("2020-08-24", 10, 1)],
  },
  {
    symbol: "INFY",
    name: "Infosys Limited",
    tickerNse: "INFY",
    tickerBse: "500209",
    actions: [
      bonus("1997-08-19", 1, 1),
      bonus("1999-02-10", 1, 1),
      split("2000-01-27", 10, 5),
      bonus("2004-07-01", 1, 3),
      bonus("2006-07-13", 1, 1),
      bonus("2014-12-02", 1, 1),
      bonus("2015-06-15", 1, 1),
      bonus("2018-09-04", 1, 1),
    ],
  },
];

/** The calculator's one-click examples. Share counts and values are computed live, never typed in. */
export const POPULAR_EXAMPLES = [
  { symbol: "TORNTPHARM", label: "Torrent Pharma", year: 2000, shares: 100 },
  { symbol: "EICHERMOT", label: "Eicher Motors", year: 2000, shares: 100 },
  { symbol: "INFY", label: "Infosys", year: 1998, shares: 100 },
  { symbol: "RELIANCE", label: "Reliance", year: 1999, shares: 100 },
  { symbol: "TITAN", label: "Titan", year: 2000, shares: 100 },
  { symbol: "ITC", label: "ITC", year: 2000, shares: 100 },
] as const;

/** Verified bonus/split history for an NSE symbol, from the catalogue or the list above. */
export function verifiedActionsFor(
  symbol: string,
): { name: string; tickerBse: string | null; actions: CorporateActionLike[] } | null {
  const s = symbol.toUpperCase();
  const company = REFERENCE_COMPANIES.find((c) => c.tickerNse === s);
  if (company)
    return {
      name: company.name,
      tickerBse: company.tickerBse,
      actions: company.actions.filter((a) => a.actionType !== "DIVIDEND"),
    };
  const stock = CALCULATOR_STOCKS.find((c) => c.symbol === s);
  return stock ? { name: stock.name, tickerBse: stock.tickerBse, actions: stock.actions } : null;
}
