/**
 * Downloads the IEPF-2 / IEPF-4 / unclaimed-dividend statements companies
 * publish on their investor-relations pages, and optionally ingests them.
 *
 *   npm run fetch:iepf -w @recoveryos/db -- --all                 every company with an IR page on record
 *   npm run fetch:iepf -w @recoveryos/db -- --company wipro-limited --url https://…/investors/unclaimed-dividend
 *   npm run fetch:iepf -w @recoveryos/db -- --all --ingest        download, then ingest what parses
 *
 * How it behaves:
 * - It identifies itself honestly, checks robots.txt, and waits between requests.
 * - It follows only plain links to .xlsx, .xls, .csv and .pdf files whose link or
 *   label mentions IEPF, unclaimed or unpaid amounts. Pages that load their lists
 *   through scripts or forms (Reliance's year picker, for example) yield nothing:
 *   download those files by hand and use the admin importer or `ingest:iepf`.
 * - Files are kept in .data/iepf-downloads/<company>/ with a manifest (source URL,
 *   SHA-256, time), so every ingested row can be traced to its source file.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { createPrismaClient, ingestStatement, keysFromEnv } from "./index.js";
import { fetchBuffer, robotsAllows, sleep, USER_AGENT } from "./http.js";
import { formatOf } from "./statement-reader.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = join(ROOT, ".data", "iepf-downloads");
const KEYWORDS =
  /iepf|unclaim|unpaid|un-?paid|transfer(?:red)?[-_ ]?to[-_ ]?iepf|investor[-_ ]?education/i;
const DELAY_MS = 2000;

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

interface ManifestEntry {
  url: string;
  label: string;
  savedAs: string;
  sha256: string;
  bytes: number;
  contentType: string | null;
  fetchedAt: string;
}

async function main() {
  const { values } = parseArgs({
    options: {
      all: { type: "boolean", default: false },
      company: { type: "string", multiple: true },
      url: { type: "string" },
      ingest: { type: "boolean", default: false },
      max: { type: "string", default: "25" },
    },
  });
  const prisma = createPrismaClient();
  const keys = keysFromEnv();
  const max = Number(values.max);
  try {
    const companies = await prisma.company.findMany({
      where: values.all
        ? { irPageUrl: { not: null } }
        : { OR: (values.company ?? []).flatMap((c) => [{ slug: c }, { cin: c.toUpperCase() }]) },
      orderBy: { name: "asc" },
    });
    if (!companies.length) {
      console.error(
        "No companies selected. Use --all (companies with an IR page on record) or --company <slug|CIN>.",
      );
      process.exitCode = 1;
      return;
    }
    console.log(`Fetching as "${USER_AGENT}"`);
    for (const company of companies) {
      const page = values.url ?? company.irPageUrl;
      if (!page) {
        console.log(`- ${company.name}: no investor-relations page on record; pass --url.`);
        continue;
      }
      if (!(await robotsAllows(page))) {
        console.log(`- ${company.name}: robots.txt disallows ${page}; skipped.`);
        continue;
      }
      let links: FoundLink[];
      try {
        const res = await fetchBuffer(page, 30_000);
        links = findStatementLinks(res.buffer.toString("utf8"), res.finalUrl).slice(0, max);
      } catch (e) {
        console.log(`- ${company.name}: could not read ${page} (${(e as Error).message})`);
        continue;
      }
      console.log(`- ${company.name}: ${links.length} statement link(s) on ${page}`);
      if (!links.length) {
        console.log(
          "  Nothing linked directly. If the page loads statements through a form, download them by hand and use the importer.",
        );
        continue;
      }
      const dir = join(OUT, company.slug);
      await mkdir(dir, { recursive: true });
      const manifestPath = join(dir, "manifest.json");
      const manifest: ManifestEntry[] = JSON.parse(
        await readFile(manifestPath, "utf8").catch(() => "[]"),
      );
      for (const link of links) {
        await sleep(DELAY_MS);
        if (!(await robotsAllows(link.url))) {
          console.log(`  skip ${link.url} (robots.txt)`);
          continue;
        }
        try {
          const file = await fetchBuffer(link.url);
          const sha256 = createHash("sha256").update(file.buffer).digest("hex");
          const name = `${sha256.slice(0, 10)}-${decodeURIComponent(basename(new URL(file.finalUrl).pathname)).replace(/[^\w.-]+/g, "_")}`;
          const savedAs = join(dir, name);
          if (!manifest.some((m) => m.sha256 === sha256)) {
            await writeFile(savedAs, file.buffer);
            manifest.push({
              url: link.url,
              label: link.label,
              savedAs,
              sha256,
              bytes: file.buffer.length,
              contentType: file.contentType,
              fetchedAt: new Date().toISOString(),
            });
          }
          console.log(`  saved ${name} (${Math.round(file.buffer.length / 1024)} KB)`);
          if (values.ingest) {
            const probe = await ingestStatement(
              prisma,
              keys,
              { buffer: file.buffer, fileName: name, contentType: file.contentType },
              { companyId: company.id, dryRun: true },
            ).catch((e: Error) => e);
            if (probe instanceof Error) {
              console.log(`    not a holder-wise statement: ${probe.message.slice(0, 140)}`);
              continue;
            }
            const job = await prisma.ingestionJob.create({
              data: {
                formType: probe.form,
                fileName: name,
                storageKey: `file:${savedAs}`,
                sourceUrl: link.url,
                companyId: company.id,
                status: "PROCESSING",
                startedAt: new Date(),
              },
            });
            const r = await ingestStatement(
              prisma,
              keys,
              { buffer: file.buffer, fileName: name, contentType: file.contentType },
              { companyId: company.id, form: probe.form, jobId: job.id },
            );
            await prisma.ingestionJob.update({
              where: { id: job.id },
              data: {
                status: "COMPLETED",
                totalRows: r.totalRows,
                insertedRows: r.insertedRows,
                updatedRows: r.updatedRows,
                skippedRows: r.skippedRows,
                errors: r.errors,
                finishedAt: new Date(),
              },
            });
            console.log(
              `    ingested ${r.form}: ${r.insertedRows} new, ${r.updatedRows} updated, ${r.skippedRows} skipped`,
            );
          }
        } catch (e) {
          console.log(`  failed ${link.url}: ${(e as Error).message}`);
        }
      }
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
