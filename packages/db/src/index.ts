import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client.js";

export * from "./generated/prisma/client.js";
export * from "./crypto.js";
export * from "./columns.js";
export * from "./ingest-iepf.js";
export * from "./market-sources.js";

export const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54329/recoveryos";

export function createPrismaClient(
  url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
