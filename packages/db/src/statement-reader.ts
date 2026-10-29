import * as XLSX from "xlsx";

/**
 * Reads the investor-wise statements companies publish under the IEPF Rules:
 *   IEPF-2  unpaid and unclaimed amounts (dividends, matured deposits) still with the company
 *   IEPF-4  shares transferred, or due to be transferred, to the IEPF Authority
 * Companies post them as .xlsx, legacy .xls, .csv or PDF tables, usually
 * with a title block above the header row. This module turns any of those
 * into a grid of cells and finds the header row; `ingest-iepf.ts` maps it.
 */

export interface RawTable {
  headers: string[];
  rows: unknown[][];
  /** 1-based row (or PDF line) number of the first data row, for error messages. */
  firstDataRow: number;
  /** Sheet name, or "page 1-n" for PDFs. */
  sheet: string;
}

export type StatementFormat = "xlsx" | "xls" | "csv" | "pdf";

export function formatOf(fileName: string, contentType?: string | null): StatementFormat | null {
  const ext = /\.([a-z0-9]+)(?:$|\?)/i.exec(fileName)?.[1]?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv" || ext === "pdf") return ext;
  const ct = contentType?.toLowerCase() ?? "";
  if (ct.includes("pdf")) return "pdf";
  if (ct.includes("spreadsheetml")) return "xlsx";
  if (ct.includes("ms-excel")) return "xls";
  if (ct.includes("csv")) return "csv";
  return null;
}

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * A header row names a folio or demat account column among several short
 * cells. (MCA's own e-form template carries an instructions cell that also
 * mentions "DP Id-Client Id"; it is one long cell, not a header row.)
 */
export function isHeaderRow(cells: unknown[]): boolean {
  const short = cells.map((c) => String(c ?? "").trim()).filter((c) => c && c.length <= 80);
  if (short.length < 3) return false;
  return short.some((c) => {
    const n = norm(c);
    return n.startsWith("folio") || n.includes("dpidclientid");
  });
}

function fromGrid(grid: unknown[][], sheet: string): RawTable | null {
  const headerIndex = grid.findIndex((r) => Array.isArray(r) && isHeaderRow(r));
  if (headerIndex < 0) return null;
  let headers = grid[headerIndex]!.map((c) => String(c ?? "").trim());
  let dataStart = headerIndex + 1;
  // Two-row headers ("Investor" / "First Name"): merge a second header-like row.
  const next = grid[dataStart];
  if (next && next.some((c) => /name|number|date|amount/i.test(String(c ?? ""))) && !next.some((c) => /\d{4,}/.test(String(c ?? "")))) {
    headers = headers.map((h, i) => [h, String(next[i] ?? "").trim()].filter(Boolean).join(" "));
    dataStart++;
  }
  return { headers, rows: grid.slice(dataStart), firstDataRow: dataStart + 1, sheet };
}

function readWorkbook(buffer: Buffer, format: "xlsx" | "xls" | "csv"): RawTable {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: format === "csv", dense: true });
  for (const name of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, defval: null, blankrows: true, raw: true });
    const table = fromGrid(grid, name);
    if (table) return table;
  }
  throw new Error("No header row with a folio number or DP ID-client ID column was found.");
}

interface PdfItem {
  str: string;
  x: number;
  y: number;
  w: number;
}

interface PdfLine {
  y: number;
  page: number;
  items: PdfItem[];
}

interface Column {
  left: number;
  right: number;
  items: PdfItem[];
}

const center = (i: PdfItem) => i.x + i.w / 2;
const hasDataDigits = (l: PdfLine) => l.items.some((i) => /\d{4,}/.test(i.str) || /^[\d.,/-]+$/.test(i.str));
const HEADER_WORDS = /\b(investor|name|father|husband|folio|amount|date|transfer\w*|number|shares?|state|country|district|pin|address|type|investment|proposed|year|nature|client|dp|account|remarks|holder|nominee|pan|birth|iepf|of|to)\b/i;
const looksLikeHeader = (l: PdfLine) => !hasDataDigits(l) && l.items.some((i) => HEADER_WORDS.test(i.str));

/**
 * PDF tables have no cells, only positioned text, and statutory statements
 * wrap both their headers ("Investor First" over "Name") and their records
 * (an address over two lines). So:
 * 1. Lines are rebuilt from text y positions, page by page.
 * 2. The header is the line naming the folio column plus the lines within a
 *    line-height of it; its words are grouped into columns where they overlap
 *    horizontally, and each column's words are read top to bottom.
 * 3. Data text goes to the column whose span contains its centre, or the
 *    nearest column centre (headers are often centred over left-set data).
 * 4. A record starts on each line with text in the name column; lines with
 *    none (wrapped addresses, IDs) join the nearest record line.
 */
async function readPdf(buffer: Buffer): Promise<RawTable> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  const lines: PdfLine[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items as { str?: string; transform?: number[]; width?: number }[])
      .filter((i) => i.str?.trim() && i.transform)
      .map((i) => ({ str: i.str!.trim(), x: i.transform![4]!, y: i.transform![5]!, w: i.width ?? 0 }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const pageLines: PdfLine[] = [];
    for (const it of items) {
      const line = pageLines.find((l) => Math.abs(l.y - it.y) <= 2.5);
      if (line) line.items.push(it);
      else pageLines.push({ y: it.y, page: p, items: [it] });
    }
    for (const l of pageLines) l.items.sort((a, b) => a.x - b.x);
    lines.push(...pageLines);
  }
  const pages = doc.numPages;
  await task.destroy();

  const headerIdx = lines.findIndex((l) => isHeaderRow(l.items.map((i) => i.str)));
  if (headerIdx < 0) throw new Error("No header row with a folio number column was found in the PDF.");
  const header = lines[headerIdx]!;
  // Headers wrap over up to four lines: chain outwards while lines stay close and hold no data.
  const headerLines = new Set<PdfLine>([header]);
  for (const step of [-1, 1]) {
    let prev = header;
    for (let i = headerIdx + step; Math.abs(i - headerIdx) <= 4; i += step) {
      const l = lines[i];
      if (!l || l.page !== header.page || Math.abs(l.y - prev.y) > 13 || !looksLikeHeader(l)) break;
      headerLines.add(l);
      prev = l;
    }
  }

  // 2. Columns from overlapping header words.
  const columns: Column[] = [];
  for (const it of [...headerLines].flatMap((l) => l.items).sort((a, b) => a.x - b.x)) {
    const col = columns.find((c) => it.x <= c.right + 1.5 && it.x + it.w >= c.left - 1.5);
    if (col) {
      col.items.push(it);
      col.left = Math.min(col.left, it.x);
      col.right = Math.max(col.right, it.x + it.w);
    } else columns.push({ left: it.x, right: it.x + it.w, items: [it] });
  }
  columns.sort((a, b) => a.left - b.left);
  const headers = columns.map((c) =>
    c.items
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((i) => i.str)
      .join(" ")
      // Words broken mid-way ("Investm ent", "transferr ed") are rejoined.
      .replace(/([a-z])- ?([a-z])/g, "$1$2"),
  );
  const columnOf = (it: PdfItem) => {
    const c = center(it);
    const inside = columns.findIndex((col) => c >= col.left - 2 && c <= col.right + 2);
    if (inside >= 0) return inside;
    let best = 0;
    columns.forEach((col, i) => {
      if (Math.abs((col.left + col.right) / 2 - c) < Math.abs((columns[best]!.left + columns[best]!.right) / 2 - c)) best = i;
    });
    return best;
  };

  // The record key: the leftmost name column (or the folio column).
  const keyCol = (() => {
    const named = headers.findIndex((h) => /first ?name|investor ?name|shareholder ?name|^name/i.test(h));
    return named >= 0 ? named : headers.findIndex((h) => /folio/i.test(h));
  })();

  // 3–4. Data lines into records.
  const data = lines.slice(headerIdx + 1).filter((l) => !headerLines.has(l) && !isHeaderRow(l.items.map((i) => i.str)));
  const assigned = data.map((l) => ({ line: l, cells: new Map<number, PdfItem[]>() }));
  for (const a of assigned) {
    for (const it of a.line.items) {
      const c = columnOf(it);
      a.cells.set(c, [...(a.cells.get(c) ?? []), it]);
    }
  }
  // A record starts with a name, or with its own folio (holders listed with a surname only).
  const folioCol = headers.findIndex((h) => /folio/i.test(h));
  const starts = assigned.filter((a) => a.cells.has(keyCol) || (folioCol >= 0 && (a.cells.get(folioCol) ?? []).some((i) => /\d/.test(i.str))));
  const members = new Map(starts.map((s) => [s, [s]]));
  // A continuation line belongs to the record that started above it, except a
  // line sitting just over the next record's first line (a top-wrapped cell).
  for (const a of assigned) {
    if (members.has(a)) continue;
    const samePage = starts.filter((s) => s.line.page === a.line.page);
    const below = samePage.filter((s) => s.line.y < a.line.y).sort((x, y) => y.line.y - x.line.y)[0];
    const above = samePage.filter((s) => s.line.y > a.line.y).sort((x, y) => x.line.y - y.line.y)[0];
    const target = below && a.line.y - below.line.y <= 4 ? below : (above ?? below);
    if (target && Math.abs(target.line.y - a.line.y) <= 80) members.get(target)!.push(a);
  }
  const rows: unknown[][] = starts.map((s) => {
    const parts = members.get(s)!.sort((x, y) => y.line.y - x.line.y);
    return columns.map((_, c) =>
      parts
        .flatMap((p) => p.cells.get(c) ?? [])
        .map((i) => i.str)
        .join(" ")
        .replace(/(\d)- (\w)/g, "$1-$2")
        .trim(),
    );
  });
  return { headers, rows, firstDataRow: 1, sheet: `pages 1-${pages}` };
}

export async function readStatement(buffer: Buffer, fileName: string, contentType?: string | null): Promise<RawTable> {
  const format = formatOf(fileName, contentType);
  if (!format) throw new Error("Upload a .xlsx, .xls, .csv or .pdf statement.");
  return format === "pdf" ? readPdf(buffer) : readWorkbook(buffer, format);
}
