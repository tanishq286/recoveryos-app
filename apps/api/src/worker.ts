import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Worker } from "bullmq";

import { AppModule } from "./app.module.js";
import { ENV, type Env } from "./config/env.js";
import { JobHandlersService } from "./common/queue/job-handlers.service.js";
import { QUEUE_NAME, type JobName } from "./common/queue/jobs.js";

/**
 * BullMQ worker: runs ETL imports, search-index syncs and analyst
 * notifications with retries. Needs REDIS_URL; without it the API runs jobs
 * inline and this process is not needed.
 */
const log = new Logger("Worker");
const ctx = await NestFactory.createApplicationContext(AppModule);
const env = ctx.get<Env>(ENV);
if (!env.REDIS_URL) {
  log.error(
    "REDIS_URL is not set. Jobs run inline in the API; there is nothing for a worker to do.",
  );
  await ctx.close();
  process.exit(1);
}
const { handlers } = ctx.get(JobHandlersService);
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const handler = handlers[job.name as JobName] as ((p: unknown) => Promise<void>) | undefined;
    if (!handler) throw new Error(`Unknown job ${job.name}`);
    await handler(job.data);
  },
  { connection: { url: env.REDIS_URL }, concurrency: 4 },
);
worker.on("completed", (job) => log.log(`${job.name} ${job.id} done`));
worker.on("failed", (job, err) => log.error(`${job?.name} ${job?.id} failed: ${err.message}`));
log.log(`Worker listening on queue "${QUEUE_NAME}".`);

const stop = async () => {
  await worker.close();
  await ctx.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
