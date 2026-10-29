#!/usr/bin/env node
// A real PostgreSQL 18 (with pg_trgm and fuzzystrmatch) for local development
// and tests, with no system install and no sudo. Data lives in <repo>/.data/pg.
//   npm run db:start            keeps running until Ctrl+C
// Creates the `recoveryos` and `recoveryos_test` databases on first start.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const dataDir = join(root, ".data", "pg");
const port = Number(process.env.PGPORT ?? 54329);
const fresh = !existsSync(join(dataDir, "PG_VERSION"));
mkdirSync(join(root, ".data"), { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  onLog: () => {},
});

if (fresh) await pg.initialise();
await pg.start();
for (const db of ["recoveryos", "recoveryos_test"]) {
  try {
    await pg.createDatabase(db);
  } catch (e) {
    if (!String(e?.message ?? e).includes("already exists")) throw e;
  }
}
console.log(
  `Postgres 18 ready on postgresql://postgres:postgres@127.0.0.1:${port}/recoveryos (data: ${dataDir})`,
);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
