#!/usr/bin/env node
// Copies the real catalogue and holder data from one database to another,
// re-encrypting every folio number under the target's keys:
//
//   SOURCE_DATABASE_URL=postgresql://…local…  TARGET_DATABASE_URL=postgresql://…neon (direct)…
//   node --env-file=../../.env.prod.keys scripts/copy-to-production.mjs
//
// FOLIO_ENCRYPTION_KEY / FOLIO_HASH_KEY are the TARGET keys (required).
// SOURCE_FOLIO_ENCRYPTION_KEY / SOURCE_FOLIO_HASH_KEY default to the
// development keys the local database uses. Users, cases, OTPs, audit and
// ingestion records are not copied. Re-running skips rows already present.
import { decryptField, encryptField, blindIndex, keysFromEnv } from "../dist/index.js";
import pg from "pg";

const TABLES = [
  "companies",
  "corporate_actions",
  "listed_equities",
  "name_words",
  "unclaimed_folios",
];
const BATCH = 500;

const source = process.env.SOURCE_DATABASE_URL;
const target = process.env.TARGET_DATABASE_URL;
if (!source || !target) throw new Error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL.");
if (source === target) throw new Error("Source and target are the same database.");

const targetKeys = keysFromEnv({ ...process.env, NODE_ENV: "production" });
const sourceKeys = keysFromEnv({
  FOLIO_ENCRYPTION_KEY: process.env.SOURCE_FOLIO_ENCRYPTION_KEY,
  FOLIO_HASH_KEY: process.env.SOURCE_FOLIO_HASH_KEY,
});
if (targetKeys.encryptionKey.equals(sourceKeys.encryptionKey))
  throw new Error("Target keys equal the source keys; set the production FOLIO_* keys.");

const src = new pg.Client({ connectionString: source });
const dst = new pg.Client({ connectionString: target });
await src.connect();
await dst.connect();

/** Stored (non-generated) columns, in table order, with whether each is json/jsonb. */
async function columns(table) {
  const r = await src.query(
    `SELECT a.attname, format_type(a.atttypid, NULL) IN ('json', 'jsonb') AS json
     FROM pg_attribute a
     WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = ''
     ORDER BY a.attnum`,
    [table],
  );
  return r.rows;
}

function reencrypt(row) {
  const plain = decryptField(row.folio_number, sourceKeys);
  row.folio_number = encryptField(plain, targetKeys);
  row.folio_number_hash = blindIndex(plain, targetKeys);
  row.ingestion_job_id = null; // ingestion records stay with the source
  return row;
}

for (const table of TABLES) {
  const cols = await columns(table);
  const list = cols.map((c) => `"${c.attname}"`).join(", ");
  const total = (await src.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0].n;
  // Page by the primary key: OFFSET over a non-unique order skips and repeats rows.
  const pk = (
    await src.query(
      `SELECT string_agg(format('%I', a.attname), ', ' ORDER BY k.ord) AS cols
       FROM pg_index i
       CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
       WHERE i.indrelid = $1::regclass AND i.indisprimary`,
      [table],
    )
  ).rows[0].cols;
  if (!pk) throw new Error(`${table} has no primary key to page by.`);
  let copied = 0;
  for (let offset = 0; offset < total; offset += BATCH) {
    const { rows } = await src.query(
      `SELECT ${list} FROM "${table}" ORDER BY ${pk} LIMIT ${BATCH} OFFSET ${offset}`,
    );
    const values = [];
    const tuples = rows.map((raw) => {
      const row = table === "unclaimed_folios" ? reencrypt(raw) : raw;
      const start = values.length;
      for (const c of cols) {
        const v = row[c.attname];
        values.push(c.json && v !== null ? JSON.stringify(v) : v);
      }
      return `(${cols.map((_, i) => `$${start + i + 1}`).join(", ")})`;
    });
    const res = await dst.query(
      `INSERT INTO "${table}" (${list}) VALUES ${tuples.join(", ")} ON CONFLICT DO NOTHING`,
      values,
    );
    copied += res.rowCount;
  }
  const now = (await dst.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0].n;
  console.log(
    `${table.padEnd(20)} source ${String(total).padStart(6)}  inserted ${String(copied).padStart(6)}  target ${String(now).padStart(6)}`,
  );
}

// Spot-check: a target folio decrypts under the target keys and matches its blind index.
const sample = (
  await dst.query(`SELECT folio_number, folio_number_hash FROM unclaimed_folios LIMIT 1`)
).rows[0];
if (sample) {
  const plain = decryptField(sample.folio_number, targetKeys);
  if (blindIndex(plain, targetKeys) !== sample.folio_number_hash)
    throw new Error("Blind index mismatch.");
  console.log(
    "Spot-check: target folio decrypts with the production key and matches its blind index.",
  );
}
await dst.query("ANALYZE");
await src.end();
await dst.end();
