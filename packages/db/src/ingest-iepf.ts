import {
  computeEntitlement,
  parseIndianState,
  splitName,
  stateFromPincode,
  STATE_NOT_STATED,
  type FolioState,
  type CorporateActionLike,
  type IngestionForm,
} from "@recoveryos/shared";

import { blindIndex, type FieldKeys } from "./crypto.js";
import { folioColumns, folioSearchColumns } from "./columns.js";
import { bulkUpsertFolios, type StagedFolio } from "./bulk-copy.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { readStatement, type RawTable } from "./statement-reader.js";

export {
  readStatement,
  formatOf,
  type RawTable,
  type StatementFormat,
} from "./statement-reader.js";

/**
 * IEPF-2 / IEPF-4 statement ingestion, shared by the CLI
 * (`npm run ingest:iepf`) and the admin importer in the API.
 *
 * Column names follow the MCA statutory layout, matched after stripping case,
 * spaces and punctuation, with the variants companies actually publish.
 */
export type Field =
  | "first"
  | "middle"
  | "last"
  | "fullName"
  | "fatherFirst"
  | "fatherMiddle"
  | "fatherLast"
  | "fatherFull"
  | "address"
  | "country"
  | "state"
  | "city"
  | "pincode"
  | "folio"
  | "dematId"
  | "certificates"
  | "amount"
  | "shares"
  | "eventDate"
  | "companyName"
  | "cin"
  | "isin"
  | "srn"
  | "investmentType"
  | "financialYear";

export const HEADER_ALIASES: Record<Field, string[]> = {
  first: [
    "Investor First Name",
    "First Name",
    "Shareholder First Name",
    "Name of Investor First Name",
  ],
  middle: ["Investor Middle Name", "Middle Name", "Shareholder Middle Name"],
  last: ["Investor Last Name", "Last Name", "Shareholder Last Name", "Surname"],
  fullName: [
    "Investor Name",
    "Name of Investor",
    "Name of the Investor",
    "Shareholder Name",
    "Name of the Shareholder",
    "Name of Shareholder",
    "Name",
  ],
  fatherFirst: ["Father/Husband First Name", "Father First Name"],
  fatherMiddle: ["Father/Husband Middle Name", "Father Middle Name"],
  fatherLast: ["Father/Husband Last Name", "Father Last Name"],
  fatherFull: [
    "Father/Husband Name",
    "Father or Spouse Name",
    "Father's Name",
    "Father/Husband's Name",
  ],
  address: ["Address", "Investor Address", "Address of Investor"],
  country: ["Country"],
  state: ["State", "State Name"],
  city: ["District", "City", "Town", "Location"],
  pincode: ["Pin Code", "PIN", "Pincode", "Postal Code"],
  folio: ["Folio Number", "Folio No", "Folio", "Folio Numbers", "Ledger Folio", "Folio No."],
  dematId: [
    "DP Id-Client Id-Account Number",
    "DP Id-Client Id",
    "DPID-Client ID",
    "Client ID",
    "DP Client ID",
    "DPID/Client ID",
  ],
  certificates: [
    "Certificate Numbers",
    "Certificate No",
    "Share Certificate Nos",
    "Certificate Nos",
  ],
  amount: [
    "Amount Transferred",
    "Amount Transfered",
    "Amount Due",
    "Amount Due (in Rs.)",
    "Amount (in Rs.)",
    "Amount in Rs",
    "Amount",
    "Dividend Amount",
    "Unclaimed Amount",
    "Amount to be transferred",
  ],
  shares: [
    "Number of Shares",
    "Number of underlying Shares",
    "No of underlying Shares",
    "No. of Shares",
    "Shares",
    "Shares Transferred",
    "No of Shares Transferred",
    "Number of Shares to be transferred",
  ],
  eventDate: [
    "Date of Event",
    "Proposed Date of Transfer to IEPF",
    "Proposed Date of transfer to IEPF (DD-MON-YYYY)",
    "Actual Date of Transfer to IEPF",
    "Date of Transfer to IEPF",
    "Date of Transfer",
    "Transfer Date",
  ],
  companyName: ["Company Name", "Name of Company", "Name of the Company"],
  cin: ["CIN", "Company CIN", "Corporate Identification Number"],
  isin: ["ISIN", "ISIN No", "ISIN Number", "ISIN Code"],
  srn: ["SRN", "Service Request Number"],
  investmentType: ["Investment Type", "Nature of Amount", "Nature of Investment"],
  financialYear: ["Financial Year", "Dividend Year", "Year"],
};

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const LOOKUP = new Map<string, Field>();
for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [Field, string[]][]) {
  for (const a of aliases) if (!LOOKUP.has(norm(a))) LOOKUP.set(norm(a), field);
}

/** Header cell → field. Unknown headers that still clearly name a field are matched by prefix. */
function fieldOf(header: string): Field | undefined {
  const n = norm(header);
  if (LOOKUP.has(n)) return LOOKUP.get(n);
  if (n.startsWith("folio")) return "folio";
  if (n.includes("dpidclientid")) return "dematId";
  if (
    n.startsWith("proposeddateoftransfer") ||
    n.startsWith("dateofevent") ||
    n.startsWith("actualdateoftransfer")
  )
    return "eventDate";
  if (n.startsWith("amount")) return "amount";
  if (
    n.startsWith("numberofshares") ||
    n.startsWith("noofshares") ||
    n.startsWith("numberofunderlyingshares")
  )
    return "shares";
  if (n.startsWith("investorfirstname")) return "first";
  if (n.startsWith("investormiddlename")) return "middle";
  if (n.startsWith("investorlastname")) return "last";
  if (
    /(shareholder|investor|holder|member)s?name/.test(n) &&
    !/father|husband|joint|nominee/.test(n)
  )
    return "fullName";
  return undefined;
}

export function mapHeaders(headers: string[]): {
  map: Partial<Record<Field, number>>;
  unmapped: string[];
} {
  const map: Partial<Record<Field, number>> = {};
  const unmapped: string[] = [];
  headers.forEach((h, i) => {
    const f = fieldOf(h);
    if (f && map[f] === undefined) map[f] = i;
    else if (h.trim()) unmapped.push(h.trim());
  });
  return { map, unmapped };
}

/** IEPF-4 statements list shares; IEPF-2 statements list amounts. */
export function detectForm(map: Partial<Record<Field, number>>): IngestionForm {
  return map.shares !== undefined && map.amount === undefined
    ? "IEPF_4"
    : map.shares !== undefined
      ? "IEPF_4"
      : "IEPF_2";
}

export interface ParsedRow {
  row: number;
  first: string;
  middle: string;
  last: string;
  fatherOrSpouse: string | null;
  address: string | null;
  city: string | null;
  state: FolioState;
  pincode: string | null;
  folio: string;
  certificates: string | null;
  amountRupees: number;
  shares: number;
  eventDate: Date | null;
  transferFinancialYear: string | null;
  companyName: string | null;
  cin: string | null;
  isin: string | null;
  srn: string | null;
  investmentType: string | null;
}

function text(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).replace(/\s+/g, " ").trim();
}

function number(v: unknown): number {
  if (typeof v === "number") return v;
  const raw = text(v).replace(/rs\.?|inr|₹/gi, "");
  if (!raw.replace(/[\s,-]/g, "")) return 0;
  const plain = Number(raw.replace(/[,\s]/g, ""));
  if (Number.isFinite(plain)) return plain;
  // PDF cells can carry stray words from neighbours ("un 750.00 02"): take the one decimal amount.
  const decimals = raw.match(/\d[\d,]*\.\d{1,2}\b/g);
  if (decimals?.length === 1) return Number(decimals[0]!.replace(/,/g, ""));
  return Number.NaN;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime()))
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  if (typeof v === "number" && v > 20000 && v < 80000)
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000); // Excel serial
  const s = text(v)
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*\/\s*/g, "/");
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return new Date(Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!));
  m = /^(\d{1,2})[-\s/]([A-Za-z]{3})[A-Za-z]*[-\s/,]+(\d{2,4})$/.exec(s);
  if (m && MONTHS[m[2]!.toLowerCase()]) {
    const y = m[3]!.length === 2 ? 2000 + +m[3]! : +m[3]!;
    return new Date(Date.UTC(y, MONTHS[m[2]!.toLowerCase()]! - 1, +m[1]!));
  }
  return null;
}

/** Indian financial year of a date: 23 Oct 2019 → "2019-20". */
export function financialYear(d: Date): string {
  const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export type RowResult =
  { ok: true; value: ParsedRow } | { ok: false; row: number; message: string };

export function parseRow(
  cells: unknown[],
  map: Partial<Record<Field, number>>,
  rowNumber: number,
  form: IngestionForm,
): RowResult | null {
  const raw = (f: Field) => (map[f] === undefined ? undefined : cells[map[f]!]);
  const get = (f: Field) => text(raw(f));
  if (cells.every((c) => !text(c))) return null;
  // Totals and footnotes at the end of a statement are not holders.
  if (/^(total|grand total|note|\*)/i.test(text(cells.find((c) => text(c)) ?? ""))) return null;

  let first = get("first");
  let middle = get("middle");
  let last = get("last");
  if (!first && get("fullName")) {
    const p = splitName(get("fullName"));
    first = p.first;
    middle = p.middle;
    last = p.last;
  }
  // Some statements put a whole name in the middle or last column.
  if (!first && middle) {
    const [m1, ...mRest] = middle.split(" ");
    first = m1!;
    middle = mRest.join(" ");
  }
  if (!first && last) [first, last] = [last, ""];
  if (!first) return { ok: false, row: rowNumber, message: "No investor name." };

  const folio = (get("folio") || get("dematId")).replace(/\s+/g, "");
  if (!folio || folio === "-" || /^n\/?a$/i.test(folio))
    return { ok: false, row: rowNumber, message: "No folio number or demat account." };

  const country = get("country");
  const pinDigits = get("pincode").replace(/\D/g, "");
  const stateText = get("state");
  // An Indian state as written wins (PDF country cells carry address spill-over,
  // e.g. "DHARMPUR INDIA"); then a clearly foreign country; then the PIN's state;
  // else "not stated".
  const writtenState = parseIndianState(stateText);
  const foreign =
    !!country &&
    !/india$|\bindia\b|^(ind|bharat|na|n\/a|-)$/i.test(country.replace(/[^A-Za-z/ -]/g, "").trim());
  const blankState = !stateText || /^(na|n\/a|-|‐)$/i.test(stateText);
  const state: FolioState | null =
    writtenState && writtenState !== "OUT_OF_INDIA"
      ? writtenState
      : foreign || writtenState === "OUT_OF_INDIA"
        ? "OUT_OF_INDIA"
        : (stateFromPincode(pinDigits) ?? (blankState ? STATE_NOT_STATED : null));
  if (!state) return { ok: false, row: rowNumber, message: `Unknown state "${stateText}".` };

  let shares = map.shares === undefined ? 0 : number(raw("shares"));
  let amount = map.amount === undefined ? 0 : number(raw("amount"));
  // IEPF-2 statements list the shares behind unclaimed dividends as their own
  // rows, with the share count in the amount column.
  if (
    map.shares === undefined &&
    /number of (underlying )?shares|^shares$|equity shares/i.test(get("investmentType"))
  ) {
    shares = amount;
    amount = 0;
  }
  if (Number.isNaN(shares) || shares < 0)
    return { ok: false, row: rowNumber, message: "Share count is not a number." };
  if (Number.isNaN(amount) || amount < 0)
    return { ok: false, row: rowNumber, message: "Amount is not a number." };
  if (form === "IEPF_4" && shares <= 0)
    return { ok: false, row: rowNumber, message: "IEPF-4 rows need a share count." };
  if (form === "IEPF_2" && amount <= 0 && shares <= 0)
    return { ok: false, row: rowNumber, message: "IEPF-2 rows need an amount." };

  const father =
    get("fatherFull") ||
    [get("fatherFirst"), get("fatherMiddle"), get("fatherLast")].filter(Boolean).join(" ");
  let eventDate = parseDate(raw("eventDate"));
  // A PDF date that lost its day to the amount cell ("750.00 02" | "-DEC-2017").
  if (!eventDate && map.amount !== undefined) {
    const day = /\b(\d{1,2})\s*$/.exec(text(raw("amount")).replace(/\d[\d,]*\.\d{1,2}/g, ""))?.[1];
    if (day) eventDate = parseDate(`${day}${text(raw("eventDate"))}`);
  }
  const pin = pinDigits;
  const fy = get("financialYear");
  return {
    ok: true,
    value: {
      row: rowNumber,
      first,
      middle,
      last,
      fatherOrSpouse: father && !/^(na|n\/a|-)$/i.test(father) ? father : null,
      address: get("address") || null,
      city: get("city") || null,
      state,
      pincode: pin.length === 6 ? pin : null,
      folio,
      certificates: get("certificates") || null,
      amountRupees: Math.round(amount * 100) / 100,
      shares: Math.floor(shares),
      eventDate,
      transferFinancialYear: eventDate
        ? financialYear(eventDate)
        : /^\d{4}-\d{2,4}$/.test(fy)
          ? fy
          : null,
      companyName: get("companyName") || null,
      cin: get("cin").toUpperCase() || null,
      isin: get("isin").toUpperCase() || null,
      srn: get("srn") || null,
      investmentType: get("investmentType") || null,
    },
  };
}

/** A blank CSV with the MCA statutory columns, for the admin page. */
export const TEMPLATE_HEADERS = [
  "Investor First Name",
  "Investor Middle Name",
  "Investor Last Name",
  "Father/Husband First Name",
  "Father/Husband Middle Name",
  "Father/Husband Last Name",
  "Address",
  "Country",
  "State",
  "District",
  "Pin Code",
  "Folio Number",
  "DP Id-Client Id-Account Number",
  "Investment Type",
  "Amount Transferred",
  "Number of Shares",
  "Proposed Date of Transfer to IEPF",
];

export interface IngestOptions {
  /** The statement's company. Rows may instead name it by CIN or company name. */
  companyId?: string | null;
  /** IEPF-2 or IEPF-4. Detected from the columns when omitted. */
  form?: IngestionForm;
  /** ingestion_jobs.id to stamp on rows. */
  jobId?: string | null;
  /** Connection for the bulk COPY; defaults to DATABASE_URL. */
  databaseUrl?: string;
  /** Parse and report without writing. */
  dryRun?: boolean;
  /** Called with progress counts every batch. */
  onProgress?: (done: number, total: number) => void;
}

export interface IngestResult {
  form: IngestionForm;
  sheet: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  /** Time spent streaming rows in (binary COPY) and merging them, when written. */
  timings?: { copyMs: number; mergeMs: number };
  errors: { row: number; message: string }[];
  unmappedHeaders: string[];
  /** First few parsed rows (dry runs only), for checking a new layout. */
  preview: Omit<ParsedRow, "folio">[];
}

const MAX_ERRORS_KEPT = 50;

/**
 * Parses a statement and upserts its holders. Rows for the same company,
 * folio and holder are grouped (IEPF-2 lists one row per unpaid dividend).
 * Post-action shares apply every bonus and split dated after the row's event
 * date, since the IEPF keeps receiving them. Safe to re-run: rows upsert.
 */
export async function ingestStatement(
  db: PrismaClient,
  keys: FieldKeys,
  file: { buffer: Buffer; fileName: string; contentType?: string | null },
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const table: RawTable = await readStatement(file.buffer, file.fileName, file.contentType);
  const { map, unmapped } = mapHeaders(table.headers);
  if (map.first === undefined && map.fullName === undefined && map.last === undefined) {
    throw new Error(
      `No investor name column. Headers found: ${table.headers.filter(Boolean).join(", ")}`,
    );
  }
  const form = opts.form ?? detectForm(map);

  const companies = await db.company.findMany({
    select: { id: true, cin: true, slug: true, name: true, isin: true, legacyIsins: true },
  });
  const bySlugOrName = new Map<string, string>();
  for (const c of companies) {
    bySlugOrName.set(norm(c.name), c.id);
    bySlugOrName.set(norm(c.name.replace(/limited$/i, "ltd")), c.id);
  }
  const byCin = new Map(companies.filter((c) => c.cin).map((c) => [c.cin!, c.id]));
  // Old statements print the ISIN of the day, including pre-split ones.
  const byIsin = new Map(
    companies.flatMap((c) => [...(c.isin ? [c.isin] : []), ...c.legacyIsins].map((i) => [i, c.id])),
  );
  const actionsFor = new Map<string, CorporateActionLike[]>();
  async function actions(companyId: string) {
    if (!actionsFor.has(companyId)) {
      const rows = await db.corporateAction.findMany({ where: { companyId } });
      actionsFor.set(
        companyId,
        rows.map((a) => ({
          actionType: a.actionType,
          exDate: a.exDate.toISOString().slice(0, 10),
          ratioFrom: a.ratioFrom === null ? null : Number(a.ratioFrom),
          ratioTo: a.ratioTo === null ? null : Number(a.ratioTo),
          dividendPerShare: a.dividendPerShare === null ? null : Number(a.dividendPerShare),
        })),
      );
    }
    return actionsFor.get(companyId)!;
  }

  const errors: { row: number; message: string }[] = [];
  const keep = (e: { row: number; message: string }) => {
    if (errors.length < MAX_ERRORS_KEPT) errors.push(e);
  };
  const groups = new Map<
    string,
    { companyId: string; row: ParsedRow; amounts: Record<string, number>; shares: number }
  >();
  const eventKey = (r: ParsedRow) =>
    r.eventDate ? r.eventDate.toISOString().slice(0, 10) : (r.transferFinancialYear ?? "undated");
  let total = 0;
  let skipped = 0;
  table.rows.forEach((cells, i) => {
    const res = parseRow(cells, map, table.firstDataRow + i, form);
    if (!res) return;
    total++;
    if (!res.ok) {
      skipped++;
      keep({ row: res.row, message: res.message });
      return;
    }
    const r = res.value;
    const companyId =
      opts.companyId ??
      (r.cin && byCin.get(r.cin)) ??
      (r.isin && byIsin.get(r.isin)) ??
      (r.companyName && bySlugOrName.get(norm(r.companyName))) ??
      null;
    if (!companyId) {
      skipped++;
      keep({
        row: r.row,
        message: `Unknown company ${r.cin ?? r.isin ?? r.companyName ?? ""}`.trim(),
      });
      return;
    }
    const key = `${companyId}|${blindIndex(r.folio, keys)}|${[r.first, r.middle, r.last].join(" ").toUpperCase()}`;
    const g = groups.get(key);
    if (g) {
      if (r.amountRupees)
        g.amounts[eventKey(r)] =
          Math.round(((g.amounts[eventKey(r)] ?? 0) + r.amountRupees) * 100) / 100;
      g.shares = Math.max(g.shares, r.shares);
      if (r.eventDate && (!g.row.eventDate || r.eventDate > g.row.eventDate)) {
        g.row.eventDate = r.eventDate;
        g.row.transferFinancialYear = r.transferFinancialYear;
      }
    } else
      groups.set(key, {
        companyId,
        row: r,
        amounts: r.amountRupees ? { [eventKey(r)]: r.amountRupees } : {},
        shares: r.shares,
      });
  });

  const result: IngestResult = {
    form,
    sheet: table.sheet,
    totalRows: total,
    insertedRows: 0,
    updatedRows: 0,
    skippedRows: skipped,
    errors,
    unmappedHeaders: unmapped,
    preview: [],
  };
  const list = [...groups.values()];
  if (opts.dryRun) {
    result.preview = list.slice(0, 5).map(({ row }) => {
      const { folio: _folio, ...rest } = row;
      return rest;
    });
    return result;
  }

  // Post-action shares: the IEPF keeps receiving bonuses and splits after the transfer.
  const staged: StagedFolio[] = [];
  for (const g of list) {
    const r = g.row;
    const after = r.eventDate ? r.eventDate.toISOString().slice(0, 10) : null;
    const computed =
      g.shares > 0 && after
        ? computeEntitlement(g.shares, await actions(g.companyId), { acquiredOn: after }).shares
        : g.shares;
    // Actions dated on the transfer day itself are already reflected in the statement's count.
    const post = after ? Math.max(g.shares, computed) : computed;
    staged.push({
      companyId: g.companyId,
      investorFirstName: r.first,
      investorMiddleName: r.middle || null,
      investorLastName: r.last || null,
      investorFullName: [r.first, r.middle, r.last].filter(Boolean).join(" "),
      fatherOrSpouseName: r.fatherOrSpouse,
      addressLine: r.address,
      city: r.city,
      state: r.state,
      pincode: r.pincode,
      ...folioColumns(r.folio, keys),
      certificateNumbers: r.certificates,
      originalShares: g.shares,
      postActionShares: post,
      amountsByEvent: g.amounts,
      custodyStatus:
        form === "IEPF_4"
          ? "IEPF_AUTHORITY"
          : g.shares > 0
            ? "COMPANY_SUSPENSE"
            : "PHYSICAL_DORMANT",
      eventDate: r.eventDate,
      transferFinancialYear: r.transferFinancialYear,
      investmentType: r.investmentType,
      sourceFilingSrn: r.srn,
      ingestionJobId: opts.jobId ?? null,
      ...folioSearchColumns({ first: r.first, middle: r.middle, last: r.last }),
    });
  }
  const bulk = await bulkUpsertFolios(staged, { form, databaseUrl: opts.databaseUrl });
  result.insertedRows = bulk.inserted;
  result.updatedRows = bulk.updated;
  result.timings = { copyMs: bulk.copyMs, mergeMs: bulk.mergeMs };
  opts.onProgress?.(list.length, list.length);
  return result;
}
