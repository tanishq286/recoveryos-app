import type { CorporateActionType } from "./enums.js";

/**
 * Corporate-action arithmetic. Ratios follow how companies announce them:
 *   BONUS    ratioTo new shares for every ratioFrom held      (1:1 → from 1, to 1)
 *   SPLIT    face value ratioFrom → ratioTo                    (₹10 → ₹2 → from 10, to 2)
 *   MERGER   ratioTo new shares for every ratioFrom held      (swap 5 old for 2 new → from 5, to 2)
 *   DIVIDEND dividendPerShare rupees on each share held on the ex-date
 *   CASH_ENTITLEMENT  dividendPerShare rupees of non-dividend cash per share held
 * Fractional entitlements are never credited as shares (companies sell them
 * and pay cash), so every step rounds down.
 */
export interface CorporateActionLike {
  actionType: CorporateActionType;
  /** YYYY-MM-DD */
  exDate: string;
  ratioFrom?: number | null;
  ratioTo?: number | null;
  /** Rupees per share, for DIVIDEND and CASH_ENTITLEMENT. */
  dividendPerShare?: number | null;
  notes?: string | null;
  /** Where the record comes from, shown beside it. */
  source?: string | null;
}

export interface ActionStep {
  action: CorporateActionLike;
  sharesBefore: number;
  sharesAfter: number;
  /** Dividend earned on this step, in paise (DIVIDEND only). */
  dividendPaise: number;
  /** Other cash earned on this step, in paise (CASH_ENTITLEMENT only). */
  cashPaise: number;
}

export interface EntitlementResult {
  shares: number;
  steps: ActionStep[];
  /** Dividends with an ex-date inside the window, in paise. */
  dividendPaise: number;
  /** Non-dividend cash entitlements since acquisition, in paise. */
  cashPaise: number;
}

function ratio(a: CorporateActionLike): [number, number] | null {
  const from = Number(a.ratioFrom);
  const to = Number(a.ratioTo);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to <= 0) return null;
  return [from, to];
}

/** Shares after one action, rounded down. */
export function applyAction(shares: number, action: CorporateActionLike): number {
  const r = ratio(action);
  switch (action.actionType) {
    case "BONUS":
      return r ? shares + Math.floor((shares * r[1]) / r[0]) : shares;
    case "SPLIT":
      return r ? Math.floor((shares * r[0]) / r[1]) : shares;
    case "MERGER":
      return r ? Math.floor((shares * r[1]) / r[0]) : shares;
    case "DIVIDEND":
    case "CASH_ENTITLEMENT":
      return shares;
  }
}

export interface EntitlementOptions {
  /** Actions on or after this date apply (YYYY-MM-DD). */
  acquiredOn: string;
  /** Only dividends with an ex-date on or after this date are counted (YYYY-MM-DD). */
  dividendsFrom?: string;
  /** Stop at this date (YYYY-MM-DD). Defaults to every action given. */
  asOf?: string;
}

/** Replays actions in ex-date order from the acquisition date. */
export function computeEntitlement(
  originalShares: number,
  actions: readonly CorporateActionLike[],
  opts: EntitlementOptions,
): EntitlementResult {
  const ordered = [...actions]
    .filter((a) => a.exDate >= opts.acquiredOn && (!opts.asOf || a.exDate <= opts.asOf))
    .sort((a, b) => a.exDate.localeCompare(b.exDate));
  let shares = Math.max(0, Math.floor(originalShares));
  let dividendPaise = 0;
  let cashPaise = 0;
  const steps: ActionStep[] = [];
  for (const action of ordered) {
    const before = shares;
    let earned = 0;
    let cash = 0;
    const perShare = Number(action.dividendPerShare ?? 0);
    if (action.actionType === "DIVIDEND") {
      if (perShare > 0 && (!opts.dividendsFrom || action.exDate >= opts.dividendsFrom)) {
        earned = Math.round(before * perShare * 100);
        dividendPaise += earned;
      }
    } else if (action.actionType === "CASH_ENTITLEMENT") {
      if (perShare > 0) {
        cash = Math.round(before * perShare * 100);
        cashPaise += cash;
      }
    } else {
      shares = applyAction(shares, action);
    }
    steps.push({
      action,
      sharesBefore: before,
      sharesAfter: shares,
      dividendPaise: earned,
      cashPaise: cash,
    });
  }
  return { shares, steps, dividendPaise, cashPaise };
}

export interface DecadeRange {
  /** Bought on the last day of the decade: fewest actions apply. */
  low: EntitlementResult;
  /** Bought on the first day of the decade: every action in it applies. */
  high: EntitlementResult;
}

/**
 * Someone who remembers only "the 1990s" could have bought on any day of the
 * decade, so the honest answer is a range, never a single guessed number.
 */
export function entitlementRangeForDecade(
  originalShares: number,
  decade: number,
  actions: readonly CorporateActionLike[],
  opts: { dividendsFrom?: string; asOf?: string } = {},
): DecadeRange {
  const start = `${decade}-01-01`;
  const end = `${decade + 9}-12-31`;
  return {
    low: computeEntitlement(originalShares, actions, { ...opts, acquiredOn: end }),
    high: computeEntitlement(originalShares, actions, { ...opts, acquiredOn: start }),
  };
}

/** YYYY-MM-DD seven years before the given date: the IEPF transfer window for dividends. */
export function sevenYearsBefore(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${Number(y) - 7}-${m}-${d}`;
}
