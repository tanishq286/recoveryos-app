/**
 * Ingest a real IEPF-2 or IEPF-4 statement.
 *
 *   npm run ingest:iepf -w @finsol/db -- --cin L17110MH1973PLC019786 --file ./ril-iepf4-2025.xlsx
 *   npm run ingest:iepf -w @finsol/db -- --slug state-bank-of-india --file https://…/unclaimed.xls --dry-run
 *
 * --cin | --isin | --slug   the company (it must be in the catalogue; SBI has no CIN, use --isin or --slug)
 * --file                    a local path or an http(s) URL (.xlsx, .xls, .csv or .pdf)
 * --form IEPF_2 | IEPF_4    otherwise detected from the columns
 * --dry-run                 parse and report, write nothing
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseArgs } from "node:util";

import { createPrismaClient, ingestStatement, keysFromEnv } from "../index.js";
import { fetchBuffer, robotsAllows } from "../http.js";

const { values } = parseArgs({
  options: {
    cin: { type: "string" },
    isin: { type: "string" },
    slug: { type: "string" },
    file: { type: "string" },
    form: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!values.file) fail("Pass --file <path or URL>.");
if (!values.cin && !values.isin && !values.slug) fail("Pass the company: --cin, --isin or --slug.");
const form = values.form?.toUpperCase().replace("-", "_");
if (form && form !== "IEPF_2" && form !== "IEPF_4") fail("--form must be IEPF_2 or IEPF_4.");

const prisma = createPrismaClient();
try {
  const company = await prisma.company.findFirst({
    where: values.cin
      ? { cin: values.cin.toUpperCase() }
      : values.isin
        ? { isin: values.isin.toUpperCase() }
        : { slug: values.slug },
  });
  if (!company)
    fail(
      "That company is not in the catalogue. Add it to packages/shared/src/reference/companies.ts and re-seed first.",
    );

  const source = values.file!;
  let file: { buffer: Buffer; fileName: string; contentType: string | null };
  if (/^https?:\/\//i.test(source)) {
    if (!(await robotsAllows(source)))
      fail(`robots.txt on ${new URL(source).host} disallows fetching ${source}.`);
    const res = await fetchBuffer(source);
    file = {
      buffer: res.buffer,
      fileName: decodeURIComponent(basename(new URL(res.finalUrl).pathname)),
      contentType: res.contentType,
    };
  } else {
    file = { buffer: await readFile(source), fileName: basename(source), contentType: null };
  }

  const dryRun = values["dry-run"];
  const job = dryRun
    ? null
    : await prisma.ingestionJob.create({
        data: {
          formType: (form as "IEPF_2" | "IEPF_4" | undefined) ?? "IEPF_4",
          fileName: file.fileName,
          storageKey: `cli:${source}`,
          sourceUrl: source,
          companyId: company.id,
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });
  try {
    const result = await ingestStatement(prisma, keysFromEnv(), file, {
      companyId: company.id,
      form: form as "IEPF_2" | "IEPF_4" | undefined,
      jobId: job?.id,
      dryRun,
      onProgress: (done, total) => process.stdout.write(`\r${done}/${total} holders written`),
    });
    if (job) {
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          formType: result.form,
          status: "COMPLETED",
          totalRows: result.totalRows,
          insertedRows: result.insertedRows,
          updatedRows: result.updatedRows,
          skippedRows: result.skippedRows,
          errors: result.errors,
          finishedAt: new Date(),
        },
      });
    }
    process.stdout.write("\n");
    console.log(
      JSON.stringify(
        {
          company: company.name,
          file: file.fileName,
          form: result.form,
          sheet: result.sheet,
          rows: result.totalRows,
          inserted: result.insertedRows,
          updated: result.updatedRows,
          skipped: result.skippedRows,
          ...(result.timings ? { timings: result.timings } : {}),
          unmappedHeaders: result.unmappedHeaders,
          firstErrors: result.errors.slice(0, 10),
          ...(dryRun ? { preview: result.preview } : {}),
        },
        null,
        2,
      ),
    );
    if (!dryRun && result.insertedRows + result.updatedRows > 0) {
      console.log(
        "Rows are searchable now. If Meilisearch is configured, the next import or API restart re-syncs it.",
      );
    }
  } catch (e) {
    if (job)
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errors: [{ row: 0, message: (e as Error).message }],
          finishedAt: new Date(),
        },
      });
    throw e;
  }
} finally {
  await prisma.$disconnect();
}
