/** Finds statement files (IEPF-2, IEPF-4, unclaimed lists) linked from an investor-relations page. */
import { formatOf } from "./statement-reader.js";

const KEYWORDS =
  /iepf|unclaim|unpaid|un-?paid|transfer(?:red)?[-_ ]?to[-_ ]?iepf|investor[-_ ]?education/i;
export interface FoundLink {
  url: string;
  label: string;
}

/** Statement-file links on an HTML page whose URL or label mentions IEPF or unclaimed amounts. */
export function findStatementLinks(html: string, pageUrl: string): FoundLink[] {
  const out = new Map<string, FoundLink>();
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>|(?:data-href|data-url|data-file)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(re)) {
    const attrs = m[1] ?? "";
    const href = m[3] ?? /href=["']([^"']+)["']/i.exec(attrs)?.[1];
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) continue;
    let url: string;
    try {
      url = new URL(href.replace(/&amp;/g, "&"), pageUrl).toString();
    } catch {
      continue;
    }
    if (!formatOf(new URL(url).pathname)) continue;
    const label = (m[2] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!KEYWORDS.test(decodeURIComponent(url)) && !KEYWORDS.test(label)) continue;
    out.set(url, { url, label });
  }
  return [...out.values()];
}
