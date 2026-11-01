import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  BRAND,
  BRAND_EMAILS,
  rupeesInWords,
  type HoldingValuation,
  type PortfolioTotals,
} from "@finsol/shared";

const INK = rgb(0.07, 0.1, 0.16);
const MUTED = rgb(0.35, 0.4, 0.48);
const ACCENT = rgb(0.02, 0.45, 0.65);

/** Standard PDF fonts cannot draw the rupee sign, so amounts say "Rs." */
const rs = (paise: number) =>
  `Rs. ${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export interface ValuationReportInput {
  reportCode: string;
  issuedAt: Date;
  preparedFor: { name: string; phoneMasked: string; email: string | null };
  rows: HoldingValuation[];
  totals: PortfolioTotals;
  /** Per row: where the price came from and when. */
  priceNotes: string[];
}

export async function buildValuationPdf(r: ValuationReportInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Official Share Valuation Report ${r.reportCode}`);
  doc.setAuthor(BRAND.name);
  const page = doc.addPage([842, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = (s: string, x: number, y: number, size = 9, f = font, color = INK) =>
    page.drawText(s, { x, y, size, font: f, color });
  const fit = (s: string, width: number, size = 9) => {
    let out = s;
    while (out.length > 3 && font.widthOfTextAtSize(out, size) > width) out = out.slice(0, -2);
    return out === s ? s : `${out.trimEnd()}…`;
  };

  let y = 550;
  text(BRAND.name, 40, y, 12, bold, ACCENT);
  text(`Report ID ${r.reportCode}`, 600, y, 9, bold, INK);
  y -= 14;
  text(BRAND.tagline, 40, y, 8, font, MUTED);
  text(
    `Issued ${r.issuedAt.toISOString().replace("T", " ").slice(0, 16)} UTC`,
    600,
    y,
    8,
    font,
    MUTED,
  );
  y -= 30;
  text("Official Share Valuation Report", 40, y, 18, bold);
  y -= 18;
  text(
    `Prepared for ${r.preparedFor.name} (${r.preparedFor.phoneMasked}${r.preparedFor.email ? `, ${r.preparedFor.email}` : ""})`,
    40,
    y,
    9,
    font,
    MUTED,
  );

  y -= 30;
  const cols: [string, number, number][] = [
    ["Company", 40, 190],
    ["Bought", 236, 40],
    ["Original", 282, 50],
    ["Events", 338, 40],
    ["Shares today", 384, 70],
    ["Growth", 460, 40],
    ["Price / share", 506, 80],
    ["Market value", 592, 80],
    ["Dividends", 678, 70],
    ["Total", 754, 60],
  ];
  for (const [h, x] of cols) text(h, x, y, 8, bold, MUTED);
  y -= 6;
  page.drawLine({ start: { x: 40, y }, end: { x: 802, y }, thickness: 0.5, color: MUTED });
  y -= 14;
  r.rows.forEach((row, i) => {
    const values = [
      fit(`${row.name} (${row.exchange}: ${row.symbol})`, 190),
      String(row.purchaseYear),
      row.originalShares.toLocaleString("en-IN"),
      String(row.events),
      row.currentShares.toLocaleString("en-IN"),
      `${row.growthMultiple.toFixed(row.growthMultiple % 1 ? 1 : 0)}x`,
      row.pricePerShare === null
        ? "n/a"
        : `Rs. ${row.pricePerShare.toLocaleString("en-IN", { minimumFractionDigits: row.pricePerShare % 1 ? 2 : 0, maximumFractionDigits: 2 })}`,
      rs(row.marketValuePaise),
      rs(row.dividendPaise),
      rs(row.totalPaise),
    ];
    values.forEach((v, c) => text(v, cols[c]![1], y, 8.5));
    y -= 11;
    text(fit(r.priceNotes[i] ?? "", 700, 7), 48, y, 7, font, MUTED);
    y -= 15;
  });
  page.drawLine({
    start: { x: 40, y: y + 6 },
    end: { x: 802, y: y + 6 },
    thickness: 0.5,
    color: MUTED,
  });
  y -= 10;
  text("Total estimated family wealth", 40, y, 11, bold);
  text(rs(r.totals.totalPaise), 592, y, 13, bold, ACCENT);
  y -= 16;
  text(rupeesInWords(r.totals.totalPaise), 40, y, 9, bold);
  y -= 16;
  text(
    `Shares: ${r.totals.originalShares.toLocaleString("en-IN")} bought, ${r.totals.currentShares.toLocaleString("en-IN")} today (${r.totals.growthMultiple.toFixed(1)}x). Market value ${rs(r.totals.marketValuePaise)}; dividends ${rs(r.totals.dividendPaise)}.`,
    40,
    y,
    8.5,
    font,
    MUTED,
  );

  y -= 30;
  for (const line of [
    "Basis: shares after every recorded bonus and split since 1 January of the purchase year, valued at the price shown;",
    "dividends are those paid per share on each ex-date while held, counted as if never encashed.",
    "Disclaimer: a market-price estimate by Finsol Enterprises, based on the corporate actions on record and the price shown.",
    "It is not a registered valuer's certificate.",
    "The actual entitlement is confirmed during verification, and value is fixed only on the day shares are credited.",
  ]) {
    text(line, 40, y, 8, font, MUTED);
    y -= 11;
  }
  text(
    `Claims & Case Desk: ${BRAND_EMAILS.claims}   ·   Client Support: ${BRAND_EMAILS.support}   ·   ${BRAND.domain}`,
    40,
    30,
    8,
    font,
    MUTED,
  );
  text("No Upfront Fee  ·  No Recovery, No Fee  ·  100% Confidential", 560, 30, 8, bold, ACCENT);
  return Buffer.from(await doc.save());
}
