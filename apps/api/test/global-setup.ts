import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import pg from "pg";

/**
 * Rebuilds the test database from the migrations and the seed before the
 * suite. Needs the local Postgres running (`npm run db:start`), or point
 * TEST_DATABASE_URL at any disposable Postgres 15+ with pg_trgm and fuzzystrmatch.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/recoveryos_test";

export default async function setup() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  try {
    await client.connect();
  } catch (e) {
    throw new Error(
      `Cannot reach the test database (${(e as Error).message}). Start it with: npm run db:start`,
    );
  }
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
  const db = resolve(import.meta.dirname, "../../../packages/db");
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execFileSync("npx", ["prisma", "migrate", "deploy"], { cwd: db, env, stdio: "pipe" });
  // The real seed (verified catalogue only), then test-only fixtures on top.
  execFileSync("node", ["dist/seed/index.js"], { cwd: db, env, stdio: "pipe" });
  execFileSync("node", ["dist/fixtures/test-fixtures.js"], { cwd: db, env, stdio: "pipe" });
}
