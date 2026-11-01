import { Inject, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";

import { ENV, type Env } from "../config/env.js";
import { PrismaService } from "./prisma.service.js";

/** Index definitions the two search phases read; matched on each partition's index. */
const SEARCH_INDEX_PATTERNS = [
  "(last_name_key, first_name_key", // phase 1
  "(dmetaphone(last_name_norm), dmetaphone(first_name_norm))", // phase 2, sound-alike
  "(last_name_norm, first_name_norm)", // phase 2, spelling
  "(first_name_norm)",
  "(last_name_key)",
  "(first_name_key)",
  "(id, state)", // fetching the matched rows
];

/**
 * After a database restart the first searches read their indexes from disk
 * (measured p95 6.7 ms at 50M rows, versus about 1 ms warm). On start-up this
 * loads every partition's search indexes into the OS page cache with
 * pg_prewarm ('read'), and the small name vocabulary into shared buffers.
 * It runs in the background, so the API answers immediately. For warmth
 * across database restarts too, add pg_prewarm to shared_preload_libraries
 * so its autoprewarm worker restores the buffer cache.
 */
@Injectable()
export class PrewarmService implements OnApplicationBootstrap {
  private readonly log = new Logger("Prewarm");
  last: { indexes: number; blocks: number; ms: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onApplicationBootstrap() {
    if (!this.env.PREWARM_ENABLED) return;
    void this.prewarm().catch((e: Error) => this.log.warn(`Prewarm skipped: ${e.message}`));
  }

  async prewarm() {
    const started = performance.now();
    const db = this.prisma.client;
    const indexes = await db.$queryRaw<{ oid: number; def: string }[]>`
      SELECT i.indexrelid::int AS oid, pg_get_indexdef(i.indexrelid) AS def
      FROM pg_index i
      JOIN pg_inherits h ON h.inhrelid = i.indrelid
      WHERE h.inhparent = 'unclaimed_folios'::regclass`;
    const wanted = indexes.filter((x) => SEARCH_INDEX_PATTERNS.some((p) => x.def.includes(p)));
    let blocks = 0;
    for (const x of wanted) {
      const r = await db.$queryRaw<
        { n: bigint }[]
      >`SELECT pg_prewarm(${x.oid}::oid::regclass, 'read') AS n`;
      blocks += Number(r[0]?.n ?? 0);
    }
    const vocab = await db.$queryRaw<{ n: bigint }[]>`
      SELECT pg_prewarm('name_words_word_trgm'::regclass, 'buffer') + pg_prewarm('name_words'::regclass, 'buffer') AS n`;
    blocks += Number(vocab[0]?.n ?? 0);
    this.last = { indexes: wanted.length + 2, blocks, ms: Math.round(performance.now() - started) };
    this.log.log(
      `Prewarmed ${this.last.indexes} search indexes (${blocks} blocks) in ${this.last.ms} ms.`,
    );
    return this.last;
  }
}
