/**
 * Formatting helpers. Everything renders in Indian conventions and IST so the
 * server and browser always agree (no hydration drift from local time zones).
 */

const IST = "Asia/Kolkata";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrExact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const count = new Intl.NumberFormat("en-IN");

/** 8496000 paise → "₹84,960" */
export function formatPaise(paise: number, opts: { exact?: boolean } = {}): string {
  const rupees = paise / 100;
  return opts.exact ? inrExact.format(rupees) : inr.format(rupees);
}

export function formatCount(n: number): string {
  return count.format(n);
}

/** Basis points → "10%" */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

/** Integer paise share of a value, rounded down (fees never round up against the client). */
export function shareOfPaise(paise: number, bps: number): number {
  return Math.floor((paise * bps) / 10_000);
}

function toDate(value: string): Date {
  // Calendar dates (YYYY-MM-DD) are anchored to midday IST so they never slip a day.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
}

/** "2 Oct 2026" */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  }).format(toDate(value));
}

/** "Fri, 2 Oct" */
export function formatDayShort(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: IST,
  }).format(toDate(value));
}

/** "27 Sep 2026, 10:04 IST" */
export function formatDateTime(value: string): string {
  const d = toDate(value);
  const date = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  }).format(d);
  return `${date}, ${time} IST`;
}

/** "27 Sep 2026, 10:04:12 IST" — for receipts. */
export function formatReceiptTime(value: string): string {
  const d = toDate(value);
  const date = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: IST,
  }).format(d);
  return `${date}, ${time} IST`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "3f9ac2…a1c21e" — full value stays available for copy and screen readers. */
export function shortHash(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-6)}`;
}

/** Newest-first comparator for ISO instants with any offset ("Z" or "+05:30"). */
export function byNewest(a: string, b: string): number {
  return Date.parse(b) - Date.parse(a);
}
