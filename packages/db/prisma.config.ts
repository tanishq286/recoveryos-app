import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Falls back to the local embedded Postgres started by `npm run db:start`.
    url: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@127.0.0.1:54329/recoveryos",
  },
});
