/**
 * Pan-India drop folder. Files placed in data/pan-india-drop/ are loaded:
 *
 *   npm run ingest:pan-india -w @finsol/db              process what is there now
 *   npm run ingest:pan-india -w @finsol/db -- --watch   keep watching (polls every 10 s)
 *
 * What it recognises, by the file's header row:
 * - IEPF-2 / IEPF-4 / registrar unclaimed-dividend statements (.xlsx, .xls,
 *   .csv, .pdf): streamed into the state partitions with binary COPY (the
 *   same loader as the admin importer). The company comes from each row's
 *   CIN, ISIN (current or legacy) or company name, or from a file name that
 *   starts with a CIN, ISIN or company slug, e.g. `L65910MH1987PLC042961__2019.xlsx`.
 * - BSE's "List of Scrips" export (Security Code, Security Id, Security
 *   Name...) and NSE's equity lists: loaded into listed_equities, so the
 *   calculator's directory covers BSE without automated requests to BSE.
 *
 * Files are downloaded by a person from each source's own website; this tool
 * never fetches from sites that refuse automated clients. Each file moves to
 * processed/ or failed/ with a .result.json beside it.
 */
import "dotenv/config";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import * as XLSX from "xlsx";

import { createPrismaClient, ingestStatement, keysFromEnv, type PrismaClient } from "./index.js";
import { formatOf } from "./statement-reader.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const DROP_DIR = join(ROOT, "data", "pan-india-drop");

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

type Kind = "bse-scrips" | "nse-equities" | "statement";

/** First 20 rows of a spreadsheet or CSV, as normalised header candidates. */
function headerRows(buffer: Buffer): string[][] {
  const wb = XLSX.read(buffer, { type: "buffer", dense: true, sheetRows: 20 });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  return XLSX.utils
    .sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })
    .map((r) => r.map(norm));
}

export function detectKind(fileName: string, buffer: Buffer): Kind {
  if (formatOf(fileName) === "pdf") return "statement";
  for (const row of headerRows(buffer)) {
    if (
      row.includes("securitycode") &&
      (row.includes("securityid") || row.includes("securityname"))
    )
      return "bse-scrips";
    if (
      row.includes("symbol") &&
      row.some((c) => c === "nameofcompany" || c === "nameofthecompany")
    )
      return "nse-equities";
  }
  return "statement";
}

async function loadEquities(db: PrismaClient, buffer: Buffer, kind: Kind) {
  const wb = XLSX.read(buffer, { type: "buffer", dense: true, raw: true });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!, {
    defval: null,
  });
  const pick = (r: Record<string, unknown>, ...names: string[]) => {
    for (const [k, v] of Object.entries(r))
      if (names.includes(norm(k))) return String(v ?? "").trim();
    return "";
  };
  const data = rows.flatMap((r) => {
    if (kind === "bse-scrips") {
      const status = pick(r, "status");
      const instrument = pick(r, "instrument");
      if (status && !/active/i.test(status)) return [];
      if (instrument && !/equity/i.test(instrument)) return [];
      // Yahoo Finance and price lookups address BSE listings by their numeric code.
      const symbol = pick(r, "securitycode");
      const name = pick(r, "issuername", "securityname");
      return symbol && name
        ? [
            {
              exchange: "BSE",
              symbol,
              name,
              isin: pick(r, "isinno", "isin") || null,
              series: pick(r, "group") || null,
            },
          ]
        : [];
    }
    const symbol = pick(r, "symbol");
    const name = pick(r, "nameofcompany", "nameofthecompany");
    return symbol && name
      ? [
          {
            exchange: "NSE",
            symbol,
            name,
            isin: pick(r, "isinnumber", "isin") || null,
            series: pick(r, "series") || null,
          },
        ]
      : [];
  });
  for (let i = 0; i < data.length; i += 1000) {
    await db.$transaction(
      data.slice(i, i + 1000).map((d) =>
        db.listedEquity.upsert({
          where: { exchange_symbol: { exchange: d.exchange, symbol: d.symbol } },
          update: { name: d.name, isin: d.isin, series: d.series, updatedAt: new Date() },
          create: d,
        }),
      ),
    );
  }
  return { equities: data.length };
}

/** A file name starting with a CIN, ISIN or slug names the company for the whole file. */
async function companyFromFileName(db: PrismaClient, fileName: string) {
  const prefix = basename(fileName).split(/__|\s/)[0]!.toUpperCase();
  const c = await db.company.findFirst({
    where: {
      OR: [
        { cin: prefix },
        { isin: prefix },
        { legacyIsins: { has: prefix } },
        { slug: prefix.toLowerCase() },
      ],
    },
    select: { id: true },
  });
  return c?.id;
}

export async function processFile(
  db: PrismaClient,
  path: string,
): Promise<Record<string, unknown>> {
  const buffer = await readFile(path);
  const fileName = basename(path);
  const kind = detectKind(fileName, buffer);
  if (kind !== "statement") return { kind, ...(await loadEquities(db, buffer, kind)) };
  const companyId = await companyFromFileName(db, fileName);
  const job = await db.ingestionJob.create({
    data: {
      formType: "IEPF_2",
      fileName,
      storageKey: `file:${path}`,
      sourceUrl: `drop-folder:${fileName}`,
      companyId: companyId ?? null,
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });
  try {
    const r = await ingestStatement(
      db,
      keysFromEnv(),
      { buffer, fileName },
      { companyId, jobId: job.id },
    );
    await db.ingestionJob.update({
      where: { id: job.id },
      data: {
        formType: r.form,
        status: "COMPLETED",
        totalRows: r.totalRows,
        insertedRows: r.insertedRows,
        updatedRows: r.updatedRows,
        skippedRows: r.skippedRows,
        errors: r.errors,
        finishedAt: new Date(),
      },
    });
    return {
      kind,
      form: r.form,
      rows: r.totalRows,
      inserted: r.insertedRows,
      updated: r.updatedRows,
      skipped: r.skippedRows,
      firstErrors: r.errors.slice(0, 5),
    };
  } catch (e) {
    await db.ingestionJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errors: [{ row: 0, message: (e as Error).message }],
        finishedAt: new Date(),
      },
    });
    throw e;
  }
}

async function sweep(db: PrismaClient, dir: string) {
  await mkdir(join(dir, "processed"), { recursive: true });
  await mkdir(join(dir, "failed"), { recursive: true });
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    if (!formatOf(name)) continue;
    // Skip files still being copied in: the size must hold for two seconds.
    const before = (await stat(path)).size;
    await new Promise((r) => setTimeout(r, 2000));
    if ((await stat(path)).size !== before) continue;
    let result: Record<string, unknown>;
    let target: "processed" | "failed" = "processed";
    try {
      result = await processFile(db, path);
    } catch (e) {
      result = { error: (e as Error).message };
      target = "failed";
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const moved = join(dir, target, `${stamp}__${name}`);
    await rename(path, moved);
    await writeFile(`${moved}.result.json`, JSON.stringify({ file: name, ...result }, null, 2));
    console.log(
      `${target === "processed" ? "loaded" : "failed"} ${name}: ${JSON.stringify(result)}`,
    );
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      dir: { type: "string", default: DROP_DIR },
      watch: { type: "boolean", default: false },
    },
  });
  const dir = resolve(values.dir!);
  await mkdir(dir, { recursive: true });
  const db = createPrismaClient();
  try {
    await sweep(db, dir);
    while (values.watch) {
      await new Promise((r) => setTimeout(r, 10_000));
      await sweep(db, dir);
    }
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
