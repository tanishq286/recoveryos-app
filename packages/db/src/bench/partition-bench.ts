/**
 * Load and search benchmark for the state-partitioned folio store.
 *
 *   npm run bench:partitions -w @recoveryos/db -- --rows 5000000
 *
 * Runs ONLY against a database whose name ends in `_bench` (default
 * recoveryos_bench, created if missing). It fills that database with
 * generated holders so load speed and query latency can be measured at
 * scale; those rows never touch the real database.
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import pg from "pg";
import { phoneticKeys, joinName } from "@recoveryos/shared";

import { bulkUpsertFolios, type StagedFolio } from "../bulk-copy.js";
import { keysFromEnv } from "../crypto.js";
import { folioColumns } from "../columns.js";

const FIRST =
  `RAMESH SURESH MAHESH RAJESH DINESH MUKESH RAKESH NARESH ANIL SUNIL ANITA SUNITA KAVITA SAVITA
MEENA REKHA USHA ASHA GEETA SEEMA PRAKASH VIJAY AJAY SANJAY MANOJ VINOD ASHOK DEEPAK ARUN VARUN KIRAN
RAVI SHANKAR GANESH SATISH HARISH GIRISH NITIN SACHIN AMIT SUMIT ROHIT MOHIT LALIT KAMAL NIRMAL VIMAL
SHYAM GHANSHYAM RADHA KRISHNA GOPAL MADHU PUSHPA LATA SAROJ KUSUM SHANTI PREMA HEMA URMILA SUSHILA
BHARAT JAGDISH OM PRAVIN NAVIN JITENDRA SURENDRA MAHENDRA RAJENDRA NARENDRA DHARMENDRA YOGESH UMESH
HITESH PARESH JIGNESH ALPESH KALPESH BHAVESH DILIP KISHORE MANISH PANKAJ PRADEEP SANDEEP KULDEEP
GURPREET HARPREET MANPREET JASPAL BALJIT VENKATESH SRINIVAS SUBRAMANIAN LAKSHMI PADMA VIJAYA SARASWATI
ABDUL MOHAMMED IMRAN SALIM FARIDA ZUBAIR JOSEPH THOMAS MARY GEORGE`.split(/\s+/);
const LAST =
  `SHARMA VERMA GUPTA AGARWAL AGRAWAL JAIN SHAH MEHTA PATEL DESAI JOSHI KULKARNI DESHPANDE PATIL
PAWAR JADHAV SHINDE MORE CHAVAN GAIKWAD SINGH KUMAR YADAV MISHRA PANDEY TIWARI DUBEY SRIVASTAVA
CHATTERJEE BANERJEE MUKHERJEE GHOSH BOSE DAS DUTTA SEN ROY REDDY RAO NAIDU IYER IYENGAR NAIR MENON PILLAI
KHAN SHAIKH ANSARI QURESHI FERNANDES DSOUZA KAPOOR MALHOTRA KHANNA CHOPRA ARORA BHATIA SETHI GILL SANDHU
GREWAL CHAUHAN RATHORE SOLANKI PARMAR BHATT TRIVEDI VYAS OZA GOEL MITTAL BANSAL SINGHAL GARG KHANDELWAL
MAHESHWARI SOMANI BIYANI DAGA TOSHNIWAL LOHIA JHUNJHUNWALA PODDAR RUIA KEJRIWAL`.split(/\s+/);
// Rough share of holders by state (population and investor density).
const STATES: [string, number][] = [
  ["MAHARASHTRA", 18],
  ["GUJARAT", 11],
  ["UTTAR_PRADESH", 8],
  ["DELHI", 7],
  ["WEST_BENGAL", 7],
  ["TAMIL_NADU", 7],
  ["KARNATAKA", 6],
  ["RAJASTHAN", 5],
  ["ANDHRA_PRADESH", 4],
  ["TELANGANA", 4],
  ["MADHYA_PRADESH", 4],
  ["KERALA", 3],
  ["PUNJAB", 3],
  ["HARYANA", 3],
  ["BIHAR", 2],
  ["ODISHA", 1],
  ["ASSAM", 1],
  ["JHARKHAND", 1],
  ["CHHATTISGARH", 1],
  ["UTTARAKHAND", 1],
  ["OUT_OF_INDIA", 1],
  ["UNKNOWN", 2],
  ["GOA", 0.5],
  ["CHANDIGARH", 0.5],
  ["JAMMU_AND_KASHMIR", 0.5],
  ["HIMACHAL_PRADESH", 0.5],
  ["PUDUCHERRY", 0.2],
  ["TRIPURA", 0.1],
  ["MEGHALAYA", 0.1],
];

/** Deterministic pseudo-random numbers, so runs are comparable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 2 ** 32;
}

function pickState(r: number): string {
  const total = STATES.reduce((a, [, w]) => a + w, 0);
  let x = r * total;
  for (const [s, w] of STATES) if ((x -= w) <= 0) return s;
  return "MAHARASHTRA";
}

function* holders(n: number, companyId: string, keys: ReturnType<typeof keysFromEnv>) {
  const rand = rng(42);
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
  for (let i = 0; i < n; i++) {
    const first = pick(FIRST);
    const middle = rand() < 0.5 ? pick(FIRST) : "";
    const last = pick(LAST);
    const shares = rand() < 0.6 ? Math.floor(rand() * 500) + 1 : 0;
    const row: StagedFolio = {
      companyId,
      investorFirstName: first,
      investorMiddleName: middle || null,
      investorLastName: last,
      investorFullName: [first, middle, last].filter(Boolean).join(" "),
      fatherOrSpouseName: null,
      addressLine: null,
      city: null,
      state: pickState(rand()),
      pincode: null,
      ...folioColumns(`B${String(i).padStart(9, "0")}`, keys),
      certificateNumbers: null,
      originalShares: shares,
      postActionShares: shares,
      amountsByEvent: { "2019-08-01": Math.round(rand() * 500000) / 100 },
      custodyStatus: shares ? "IEPF_AUTHORITY" : "PHYSICAL_DORMANT",
      eventDate: new Date("2019-08-01"),
      transferFinancialYear: "2019-20",
      investmentType: null,
      sourceFilingSrn: null,
      fullNameNorm: joinName({ first, middle, last }),
      firstNameNorm: first,
      middleNameNorm: middle,
      lastNameNorm: last,
      firstNameKey: phoneticKeys(first),
      middleNameKey: phoneticKeys(middle),
      lastNameKey: phoneticKeys(last),
      ingestionJobId: null,
    };
    yield row;
  }
}

/** The production search's two phases (apps/api/src/modules/search/search-engine.ts). */
const PHASE1 = `
SELECT f.id FROM unclaimed_folios f
WHERE (f.state = $1::"IndianState" OR f.state = 'UNKNOWN'::"IndianState")
  AND f.first_name_key = $2 AND f.last_name_key = $3
ORDER BY f.post_action_shares DESC
LIMIT 50`;
const STATE = `(f.state = $1::"IndianState" OR f.state = 'UNKNOWN'::"IndianState")`;
const similarWords = (param: string) =>
  `(SELECT w.word FROM name_words w WHERE w.word % ${param} ORDER BY similarity(w.word, ${param}) DESC LIMIT 20)`;
const PHASE2 = `
WITH cand AS (
  (SELECT f.id FROM unclaimed_folios f
    WHERE ${STATE} AND dmetaphone(f.first_name_norm) = dmetaphone($2)
      AND dmetaphone(f.last_name_norm) = dmetaphone($4)
    LIMIT 200)
  UNION
  (SELECT f.id FROM unclaimed_folios f
    WHERE ${STATE} AND f.first_name_norm IN ${similarWords("$2")}
      AND f.last_name_norm IN ${similarWords("$4")}
    LIMIT 200)
)
SELECT f.id,
  (GREATEST(similarity(f.first_name_norm, $2), CASE WHEN f.first_name_key = $3 THEN 0.86 ELSE 0 END)
 + GREATEST(similarity(f.last_name_norm, $4), CASE WHEN f.last_name_key = $5 THEN 0.86 ELSE 0 END)) / 2 AS score
FROM unclaimed_folios f
WHERE ${STATE} AND f.id IN (SELECT id FROM cand)
  AND (f.first_name_norm % $2 OR dmetaphone(f.first_name_norm) = dmetaphone($2)
       OR f.name_tokens @> ARRAY[lower($2)] OR f.first_name_key = $3)
  AND (f.last_name_norm % $4 OR dmetaphone(f.last_name_norm) = dmetaphone($4)
       OR f.name_tokens @> ARRAY[lower($4)] OR f.last_name_key = $5)
ORDER BY score DESC, f.post_action_shares DESC
LIMIT 50`;
const FUZZY_BELOW = 10;

const QUERY_SETS: Record<string, [string, string][]> = {
  common: [
    ["RAMESH", "SHARMA"],
    ["SUNITA", "AGARWAL"],
    ["MANOJ", "PATEL"],
    ["LAKSHMI", "IYER"],
    ["ABDUL", "KHAN"],
    ["GURPREET", "SINGH"],
    ["ANITA", "GHOSH"],
    ["DEEPAK", "MEHTA"],
  ],
  misspelt: [
    ["RAMESHH", "SHARMAA"],
    ["SUNEETA", "AGGARWALL"],
    ["MANNOJ", "PATTEL"],
    ["LAXMI", "IYYER"],
    ["ABDULL", "KHANN"],
    ["GURPRIT", "SINGHH"],
  ],
  // No phonetic match: every one of these runs the fuzzy phase.
  "no phonetic match": [
    ["ZORAWAR", "KAPADIA"],
    ["NIHARIKA", "SUBBARAYAN"],
    ["TENZIN", "NORGAY"],
    ["XAVIER", "RODRIGUES"],
    ["RAMESH", "SHAMRA"],
    ["SUNITA", "AGRAWALA"],
  ],
};
const QUERY_STATES = ["MAHARASHTRA", "GUJARAT", "DELHI", "TAMIL_NADU", "KERALA"];

const pct = (xs: number[], p: number) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))]!;

async function main() {
  const { values } = parseArgs({
    options: {
      rows: { type: "string", default: "1000000" },
      batch: { type: "string", default: "1000000" },
      queries: { type: "string", default: "300" },
      url: {
        type: "string",
        default: "postgresql://postgres:postgres@127.0.0.1:54329/recoveryos_bench",
      },
      "skip-load": { type: "boolean", default: false },
      /** Rows already loaded by an earlier run (generated and skipped, so data stays identical). */
      start: { type: "string", default: "0" },
      concurrency: { type: "string", default: "4" },
    },
  });
  const url = values.url!;
  if (!/_bench$/.test(new URL(url).pathname))
    throw new Error("Refusing: the database name must end in _bench.");
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    await run(db, values, url);
  } finally {
    await db.end();
  }
}

async function run(
  db: pg.Client,
  values: {
    rows?: string;
    batch?: string;
    queries?: string;
    "skip-load"?: boolean;
    start?: string;
    concurrency?: string;
  },
  url: string,
) {
  const keys = keysFromEnv();
  const total = Number(values.rows);

  if (!values["skip-load"]) {
    const company = await db.query<{ id: string }>(
      `INSERT INTO companies (id, name, slug, statutory_basis, nodal_officer_name, updated_at)
       VALUES (gen_random_uuid(), 'Benchmark Company (generated)', 'benchmark-company', 'Generated benchmark data', 'n/a', now())
       ON CONFLICT (slug) DO UPDATE SET updated_at = now() RETURNING id`,
    );
    const companyId = company.rows[0]!.id;
    let copyMs = 0;
    let mergeMs = 0;
    const started = performance.now();
    const gen = holders(total, companyId, keys);
    const start = Number(values.start ?? 0);
    for (let i = 0; i < start; i++) gen.next();
    // One streamed COPY; above 200,000 rows the loader rebuilds each state partition.
    const r = await bulkUpsertFolios(gen, {
      form: "IEPF_4",
      databaseUrl: url,
      concurrency: Number(values.concurrency ?? 4),
      onPhase: (m) => console.log(`  ${((performance.now() - started) / 1000).toFixed(0)}s ${m}`),
    });
    copyMs = r.copyMs;
    mergeMs = r.mergeMs;
    console.log(`${r.mode}: ${r.inserted} inserted, ${r.updated} updated`);
    const wall = (performance.now() - started) / 1000;
    await db.query("ANALYZE unclaimed_folios");
    console.log(
      JSON.stringify({
        rows: total - start,
        copyRowsPerSec: Math.round((total - start) / (copyMs / 1000)),
        mergeSeconds: Math.round(mergeMs / 1000),
        endToEndRowsPerSec: Math.round((total - start) / wall),
      }),
    );
  }

  const count = await db.query<{ n: string }>("SELECT count(*)::text AS n FROM unclaimed_folios");
  const biggest = await db.query<{ state: string; n: string }>(
    "SELECT state::text, count(*)::text AS n FROM unclaimed_folios GROUP BY 1 ORDER BY count(*) DESC LIMIT 1",
  );
  const report: Record<string, object> = {};
  for (const [set, names] of Object.entries(QUERY_SETS)) {
    const times: number[] = [];
    let fuzzy = 0;
    for (let i = 0; i < Number(values.queries); i++) {
      const [first, last] = names[i % names.length]!;
      const state = QUERY_STATES[i % QUERY_STATES.length]!;
      const t = performance.now();
      const r = await db.query(PHASE1, [state, phoneticKeys(first), phoneticKeys(last)]);
      if ((r.rowCount ?? 0) < FUZZY_BELOW) {
        fuzzy++;
        await db.query("BEGIN");
        await db.query("SET LOCAL pg_trgm.similarity_threshold = 0.45");
        await db.query("SET LOCAL gin_fuzzy_search_limit = 500");
        await db.query(PHASE2, [state, first, phoneticKeys(first), last, phoneticKeys(last)]);
        await db.query("COMMIT");
      }
      times.push(performance.now() - t);
    }
    report[set] = {
      p50ms: Math.round(pct(times, 50) * 100) / 100,
      p95ms: Math.round(pct(times, 95) * 100) / 100,
      p99ms: Math.round(pct(times, 99) * 100) / 100,
      fuzzyPhase: `${fuzzy}/${times.length}`,
    };
  }
  console.log(
    JSON.stringify({
      rowsInTable: Number(count.rows[0]!.n),
      largestPartition: biggest.rows[0],
      ...report,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
