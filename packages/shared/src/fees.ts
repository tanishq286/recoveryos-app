/**
 * Fee terms and arithmetic. All money is integer paise; shares of a value
 * round down, so a fee never rounds up against the client.
 * Draft terms: counsel review pending (see README launch gates).
 */

/** Our success fee: 10% of value actually credited, nothing upfront. */
export const DEFAULT_SUCCESS_FEE_BPS = 1000;
/** GST on our fee. */
export const GST_BPS = 1800;
/** Associate partners earn this share of the fee we collect on cases they refer. */
export const DEFAULT_ASSOCIATE_SHARE_BPS = 3000;
/** Planned, conditional insurance allocation (never presented as active cover). */
export const PROTECTION_ALLOCATION_BPS = 1000;

export function shareOfPaise(paise: number, bps: number): number {
  return Math.floor((paise * bps) / 10_000);
}

export interface Realization {
  grossPaise: number;
  feeBps: number;
  feePaise: number;
  gstPaise: number;
  netPaise: number;
}

/** Value reaching the client after our fee and the GST on it. */
export function netRealization(grossPaise: number, feeBps = DEFAULT_SUCCESS_FEE_BPS): Realization {
  const gross = Math.max(0, Math.round(grossPaise));
  const feePaise = shareOfPaise(gross, feeBps);
  const gstPaise = shareOfPaise(feePaise, GST_BPS);
  return { grossPaise: gross, feeBps, feePaise, gstPaise, netPaise: gross - feePaise - gstPaise };
}

/** An associate's commission on a fee we actually collected. */
export function associateCommission(
  feePaise: number,
  shareBps = DEFAULT_ASSOCIATE_SHARE_BPS,
): number {
  return shareOfPaise(feePaise, shareBps);
}

/** Converts a percentage such as 12.5 to basis points (1250), clamped to 0..100%. */
export function pctToBps(pct: number): number {
  return Math.round(Math.min(100, Math.max(0, pct)) * 100);
}

/** shares × price (rupees, up to 2 decimals) in paise. */
export function holdingValuePaise(shares: number, priceRupees: number): number {
  return Math.round(shares * Math.round(priceRupees * 100));
}
