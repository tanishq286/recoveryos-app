#!/usr/bin/env node
// Drops every table in DATABASE_URL, re-applies the migrations and seeds.
// Refuses to run against anything but a local database.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/recoveryos";
const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error(`Refusing to reset a non-local database (${host}).`);
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
await client.end();
const env = { ...process.env, DATABASE_URL: url };
execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
execFileSync("node", ["dist/seed/index.js"], { stdio: "inherit", env });
