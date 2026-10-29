import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createPrismaClient, keysFromEnv, type FieldKeys, type PrismaClient } from "@recoveryos/db";

import { ENV, type Env } from "../config/env.js";

/** The one Prisma client for the process, plus the folio field keys. */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;
  readonly fieldKeys: FieldKeys;

  constructor(@Inject(ENV) env: Env) {
    this.client = createPrismaClient(env.DATABASE_URL);
    this.fieldKeys = keysFromEnv();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
