/**
 * How a share price is described everywhere it appears (calculator, company
 * pages, search results, PDF reports). We do not have a contracted real-time
 * feed, so no price is ever called "live".
 *
 * - quoteAt:     when the exchange printed the price (the provider's timestamp)
 * - retrievedAt: when we fetched it
 * Both are shown; they are different facts.
 */

export type QuoteStatus =
  /** No price at all: the value stays unknown, never zero. */
  | "UNAVAILABLE"
  /** Typed in by the visitor. */
  | "MANUAL"
  /** During market hours: free market data runs behind the exchange. */
  | "DELAYED"
  /** Outside market hours: the last price of the latest session. */
  | "MARKET_CLOSED"
  /** The most recent refresh failed, or the last good price is days old. */
  | "STALE";

export interface QuoteFacts {
  price: number | null;
  /** ISO time the exchange printed the price, if the provider said. */
  quoteAt: string | null;
  /** ISO time we fetched it. */
  retrievedAt: string | null;
  /** ISO time of the latest refresh attempt, successful or not. */
  attemptedAt?: string | null;
  /** Set when the latest attempt failed. */
  error?: string | null;
  manual?: boolean;
  source?: string | null;
}

export interface QuoteDescription {
  status: QuoteStatus;
  /** Short label, e.g. "Delayed price" or "Closing price". */
  label: string;
  /** One sentence with the times, for under the figure. */
  detail: string;
}

const IST_OFFSET_MS = 5.5 * 3_600_000;
/** Older than this, a fetched price is stale even if no refresh failed. */
export const STALE_AFTER_MS = 4 * 86_400_000;

/** NSE/BSE regular session: Monday to Friday, 09:15 to 15:30 IST. Exchange holidays are not known here. */
export function isMarketHours(at: Date): boolean {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return minutes >= 9 * 60 + 15 && minutes < 15 * 60 + 30;
}

/** "30 Oct 2026, 15:29 IST": fixed to IST so server and browser agree. */
export function formatIst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} IST`;
}

export function describeQuote(q: QuoteFacts, now: Date = new Date()): QuoteDescription {
  if (q.manual)
    return {
      status: "MANUAL",
      label: "Your price",
      detail: "Entered by you, not from market data.",
    };
  if (q.price === null || !Number.isFinite(q.price))
    return {
      status: "UNAVAILABLE",
      label: "Price unavailable",
      detail: "No market price is available, so the value is not estimated.",
    };
  const quoted = q.quoteAt
    ? `quoted ${formatIst(q.quoteAt)}`
    : "quote time not given by the source";
  const fetched = q.retrievedAt ? `fetched ${formatIst(q.retrievedAt)}` : "fetch time unknown";
  const from = q.source ? ` from ${q.source}` : "";
  const failedSince =
    q.error &&
    q.attemptedAt &&
    (!q.retrievedAt || new Date(q.attemptedAt).getTime() > new Date(q.retrievedAt).getTime());
  const old = !!q.retrievedAt && now.getTime() - new Date(q.retrievedAt).getTime() > STALE_AFTER_MS;
  if (failedSince || old)
    return {
      status: "STALE",
      label: "Last known price (may be out of date)",
      detail: `${failedSince ? "The latest refresh failed. " : ""}Showing the last price we have${from}, ${quoted}; ${fetched}.`,
    };
  if (isMarketHours(now))
    return {
      status: "DELAYED",
      label: "Delayed price",
      detail: `Market data can lag the exchange. Price${from}, ${quoted}; ${fetched}.`,
    };
  return {
    status: "MARKET_CLOSED",
    label: "Latest available price (market closed)",
    detail: `Last price of the latest session${from}, ${quoted}; ${fetched}.`,
  };
}
