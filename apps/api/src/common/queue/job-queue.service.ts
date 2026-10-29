import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

import { ENV, type Env } from "../../config/env.js";
import { QUEUE_NAME, type JobHandlers, type JobName, type JobPayloads } from "./jobs.js";

/**
 * With REDIS_URL set, jobs go to BullMQ and `dist/worker.js` runs them with
 * retries and back-off. Without Redis they run in this process right after
 * the request returns, so local development needs nothing extra.
 */
@Injectable()
export class JobQueueService implements OnModuleDestroy {
  private readonly log = new Logger("Jobs");
  private readonly queue: Queue | null;
  private handlers: Partial<JobHandlers> = {};
  private readonly inflight = new Set<Promise<void>>();

  constructor(@Inject(ENV) env: Env) {
    this.queue = env.REDIS_URL
      ? new Queue(QUEUE_NAME, {
          connection: { url: env.REDIS_URL },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5_000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        })
      : null;
  }

  get mode(): "bullmq" | "inline" {
    return this.queue ? "bullmq" : "inline";
  }

  /** Inline mode only: the processors that run jobs in this process. */
  registerInlineHandlers(handlers: Partial<JobHandlers>) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  async enqueue<N extends JobName>(name: N, payload: JobPayloads[N]): Promise<void> {
    if (this.queue) {
      await this.queue.add(name, payload);
      return;
    }
    const handler = this.handlers[name] as ((p: JobPayloads[N]) => Promise<void>) | undefined;
    if (!handler) {
      this.log.warn(`No inline handler for ${name}; job dropped.`);
      return;
    }
    const run = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => handler(payload))
      .catch((e: Error) => this.log.error(`${name} failed: ${e.message}`))
      .finally(() => this.inflight.delete(run));
    this.inflight.add(run);
  }

  /** Waits for inline jobs (tests and graceful shutdown). */
  async drain(): Promise<void> {
    while (this.inflight.size) await Promise.all([...this.inflight]);
  }

  async onModuleDestroy() {
    await this.drain();
    await this.queue?.close();
  }
}
