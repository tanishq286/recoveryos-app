import "reflect-metadata";

import { StandardSchemaValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

import { AppModule } from "./app.module.js";
import { ENV, type Env } from "./config/env.js";

// BigInt (paise totals) serialises as a number in JSON responses.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this);
};

/** Builds the HTTP app; shared by main.ts and the end-to-end tests. */
export async function createApp(opts: { logger?: false } = {}): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: false,
    ...(opts.logger === false ? { logger: false } : {}),
  });
  const env = app.get<Env>(ENV);
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.enableCors({
    origin: env.WEB_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
    allowedHeaders: ["content-type", "authorization", "x-unlock-token"],
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
  return app;
}
