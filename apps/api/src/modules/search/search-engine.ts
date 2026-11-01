import { Logger } from "@nestjs/common";
import { createHash } from "node:crypto";

import { Prisma, type PrismaClient } from "@recoveryos/db";
import pg from "pg";
import { ALL_INDIA, INDIAN_STATES, phoneticKeys, type ResolvedSearch } from "@recoveryos/shared";

export interface SearchHit {
  id: string;
  /** The row's partition, so follow-up reads touch only the partitions involved. */
  state?: string;
  score: number;
  matchedBy: "exact" | "trigram" | "phonetic" | "sound-alike";
}

export interface SearchEngine {
  readonly name: "postgres" | "meilisearch";
  search(q: ResolvedSearch, limit: number): Promise<SearchHit[]>;
}

type Part = "first" | "middle" | "last";
const COLUMN: Record<Part, { norm: Prisma.Sql; key: Prisma.Sql }> = {
  first: { norm: Prisma.raw("f.first_name_norm"), key: Prisma.raw("f.first_name_key") },
  middle: { norm: Prisma.raw("f.middle_name_norm"), key: Prisma.raw("f.middle_name_key") },
  last: { norm: Prisma.raw("f.last_name_norm"), key: Prisma.raw("f.last_name_key") },
};

/**
 * Search in Postgres, in two phases, always inside one state's partition
 * (plus UNKNOWN, holders whose statement gives no state):
 * 1. Exact phonetic keys for every name part given, answered from the
 *    composite (last key, first key) index: about a millisecond even with
 *    millions of rows in the partition. Most searches end here.
 * 2. Only when phase 1 finds fewer than FUZZY_BELOW holders: fuzzy matching
 *    (see fuzzy()). A single letter ("K") matches as an initial.
 */
const FUZZY_BELOW = 10;

export class PostgresSearchEngine implements SearchEngine {
  readonly name = "postgres" as const;
  constructor(private readonly pool: pg.Pool) {}

  /**
   * A pool of its own: every search runs as a named prepared statement with a
   * cached generic plan, because planning a query over 38 partitions costs
   * about 5 ms while running it costs under 1 ms. Every search query is
   * index-driven, so sequential scans are off for these connections: generic
   * plans otherwise pick them for small partitions and evaluate the match
   * functions on every row. The connections also carry the fuzzy-match
   * settings (trigram threshold 0.45, GIN result cap 500).
   */
  static pool(databaseUrl: string): pg.Pool {
    return new pg.Pool({
      connectionString: databaseUrl,
      max: 10,
      // Keep connections (and their prepared statements) instead of closing them after 10 s idle.
      idleTimeoutMillis: 0,
      options:
        "-c plan_cache_mode=force_generic_plan -c enable_seqscan=off -c pg_trgm.similarity_threshold=0.45 -c gin_fuzzy_search_limit=500",
    });
  }

  private async run<T extends pg.QueryResultRow>(sql: Prisma.Sql): Promise<T[]> {
    const name = `s_${createHash("sha1").update(sql.text).digest("hex").slice(0, 20)}`;
    return (await this.pool.query<T>({ name, text: sql.text, values: sql.values })).rows;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async search(q: ResolvedSearch, limit: number): Promise<SearchHit[]> {
    const exact = await this.byKeys(q, limit);
    if (exact.length >= Math.min(limit, FUZZY_BELOW)) return exact;
    const fuzzy = await this.fuzzy(q, limit);
    const byId = new Map(exact.map((h) => [h.id, h]));
    for (const h of fuzzy) {
      const seen = byId.get(h.id);
      if (!seen || h.score > seen.score) byId.set(h.id, h);
    }
    return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private stateFilter(q: ResolvedSearch) {
    const custody = q.custodyStatus
      ? Prisma.sql`AND f.custody_status = ${q.custodyStatus}::"CustodyStatus"`
      : Prisma.empty;
    // All India: every partition is scanned (in parallel where the planner can).
    if (q.state === ALL_INDIA) return Prisma.sql`TRUE ${custody}`;
    return Prisma.sql`(f.state = ${q.state}::"IndianState" OR f.state = 'UNKNOWN'::"IndianState") ${custody}`;
  }

  /** Phase 1: every given part (initials excepted) matches its phonetic key exactly. */
  private async byKeys(q: ResolvedSearch, limit: number): Promise<SearchHit[]> {
    const parts = (["first", "middle", "last"] as const).filter((p) => q[p]);
    const keyed = parts.filter((p) => q[p].length > 1);
    if (!keyed.length) return [];
    const conditions = parts.map((p) =>
      q[p].length === 1
        ? Prisma.sql`${COLUMN[p].norm} LIKE ${q[p] + "%"}`
        : Prisma.sql`${COLUMN[p].key} = ${phoneticKeys(q[p])}`,
    );
    const exact = parts.map((p) =>
      q[p].length === 1 ? Prisma.sql`true` : Prisma.sql`${COLUMN[p].norm} = ${q[p]}`,
    );
    const rows = await this.run<{ id: string; state: string; exact: boolean }>(Prisma.sql`
      SELECT f.id, f.state::text AS state, (${Prisma.join(exact, " AND ")}) AS exact
      FROM unclaimed_folios f
      WHERE ${this.stateFilter(q)}
        AND ${Prisma.join(conditions, " AND ")}
      ORDER BY f.post_action_shares DESC
      LIMIT ${limit}`);
    return rows
      .map((r) => ({
        id: r.id,
        state: r.state,
        score: r.exact ? 1 : 0.86,
        matchedBy: (r.exact ? "exact" : "phonetic") as SearchHit["matchedBy"],
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Phase 2. Candidates come from two bounded branches, each capped at 200
   * rows and answered by B-tree lookups:
   *   A. sound-alike: Double Metaphone of surname and first name together,
   *      from the composite (dmetaphone(last), dmetaphone(first)) index;
   *   B. spelling: the 20 closest real spellings of each name part are found
   *      in the small `name_words` vocabulary (trigram similarity at least
   *      0.45), then looked up exactly in the (surname, first name) index.
   * Trigram scans never touch the folio table: on a partition with
   * millions of rows they cost tens of milliseconds even when nothing
   * matches. The few hundred candidates are then checked against every
   * part (initials included) and scored.
   */
  private async fuzzy(q: ResolvedSearch, limit: number): Promise<SearchHit[]> {
    const parts = (["first", "middle", "last"] as const).filter((p) => q[p]);
    const words = parts.filter((p) => q[p].length > 1);
    if (!words.length) return [];
    const conditions: Prisma.Sql[] = [];
    const scores: Prisma.Sql[] = [];
    const exact: Prisma.Sql[] = [];
    const phonetic: Prisma.Sql[] = [];
    for (const p of parts) {
      const value = q[p];
      const { norm, key } = COLUMN[p];
      if (value.length === 1) {
        conditions.push(Prisma.sql`(${norm} LIKE ${value + "%"})`);
        scores.push(Prisma.sql`0.75`);
        exact.push(Prisma.sql`false`);
        phonetic.push(Prisma.sql`false`);
        continue;
      }
      const k = phoneticKeys(value);
      conditions.push(Prisma.sql`(
        ${norm} % ${value}
        OR dmetaphone(${norm}) = dmetaphone(${value})
        OR f.name_tokens @> ARRAY[${value.toLowerCase()}]::text[]
        OR ${key} = ${k}
      )`);
      scores.push(Prisma.sql`GREATEST(
        similarity(${norm}, ${value}),
        CASE WHEN ${key} = ${k} THEN 0.86 ELSE 0 END,
        CASE WHEN dmetaphone(${norm}) = dmetaphone(${value})
          THEN GREATEST(0, 0.8 - 0.1 * levenshtein(${norm}, ${value})) ELSE 0 END
      )`);
      exact.push(Prisma.sql`(${norm} = ${value})`);
      phonetic.push(Prisma.sql`(${key} = ${k})`);
    }
    const similar = (value: string) =>
      Prisma.sql`(SELECT w.word FROM name_words w WHERE w.word % ${value}
        ORDER BY similarity(w.word, ${value}) DESC LIMIT 20)`;
    // Surname and first name drive the lookups; a middle name only filters.
    const drivers = words.filter((p) => p !== "middle");
    if (!drivers.length) return [];
    const branch = (cond: (p: (typeof drivers)[number]) => Prisma.Sql) =>
      Prisma.sql`(SELECT f.id, f.state FROM unclaimed_folios f
        WHERE ${this.stateFilter(q)} AND ${Prisma.join(drivers.map(cond), " AND ")}
        LIMIT 200)`;
    const soundAlike = branch(
      (p) => Prisma.sql`dmetaphone(${COLUMN[p].norm}) = dmetaphone(${q[p]})`,
    );
    const spelling = branch((p) => Prisma.sql`${COLUMN[p].norm} IN ${similar(q[p])}`);
    const rows = await this.run<{
      id: string;
      score: number;
      exact: boolean;
      phonetic: boolean;
      trigram: number;
      state: string;
    }>(Prisma.sql`
        WITH cand AS (${soundAlike} UNION ${spelling}),
        -- Fetch only the candidates, by primary key, before any per-row scoring.
        picked AS MATERIALIZED (
          SELECT f.* FROM cand c JOIN unclaimed_folios f ON f.id = c.id AND f.state = c.state
        )
        SELECT f.id, f.state::text AS state,
               (${Prisma.join(scores, " + ")}) / ${parts.length}::float AS score,
               (${Prisma.join(exact, " AND ")}) AS exact,
               (${Prisma.join(phonetic, " AND ")}) AS phonetic,
               similarity(f.full_name_norm, ${[q.first, q.middle, q.last].filter(Boolean).join(" ")}) AS trigram
        FROM picked f
        WHERE ${Prisma.join(conditions, " AND ")}
        ORDER BY score DESC, trigram DESC, f.post_action_shares DESC
        LIMIT ${limit}`);
    return rows.map((r) => ({
      id: r.id,
      state: r.state,
      score: Math.round(Math.min(1, Number(r.score)) * 100) / 100,
      matchedBy: r.exact
        ? "exact"
        : Number(r.score) >= 0.6 && Number(r.trigram) >= 0.5
          ? "trigram"
          : r.phonetic
            ? "phonetic"
            : "sound-alike",
    }));
  }
}

interface MeiliHit {
  id: string;
  _rankingScore?: number;
}

/**
 * Meilisearch, sharded like the Postgres table: one index per state
 * (`folios_maharashtra`, …, `folios_unknown`). A search queries only its
 * state's shard and the UNKNOWN shard, in one multi-search request.
 * Documents carry the phonetic keys as well as the names, so a key match
 * ranks like a typo-tolerant hit. Any error falls back to Postgres.
 */
export class MeiliSearchEngine implements SearchEngine {
  readonly name = "meilisearch" as const;
  private readonly log = new Logger("Meilisearch");

  constructor(
    private readonly host: string,
    private readonly apiKey: string | undefined,
    private readonly fallback: PostgresSearchEngine,
  ) {}

  async onModuleDestroy() {
    await this.fallback.onModuleDestroy();
  }

  static indexFor(state: string): string {
    return `folios_${state.toLowerCase()}`;
  }

  private headers() {
    return {
      "content-type": "application/json",
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  async search(q: ResolvedSearch, limit: number): Promise<SearchHit[]> {
    try {
      const words = [q.first, q.middle, q.last].filter(Boolean);
      const keys = words.filter((w) => w.length > 1).map(phoneticKeys);
      const filter = q.custodyStatus ? `custodyStatus = "${q.custodyStatus}"` : undefined;
      const query = (state: string) => ({
        indexUid: MeiliSearchEngine.indexFor(state),
        q: [...words, ...keys].join(" "),
        filter,
        limit,
        showRankingScore: true,
        matchingStrategy: "all",
      });
      const res = await fetch(`${this.host}/multi-search`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          queries:
            q.state === ALL_INDIA
              ? [...INDIAN_STATES, "UNKNOWN"].map(query)
              : [query(q.state), query("UNKNOWN")],
        }),
        signal: AbortSignal.timeout(800),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { results: { hits: MeiliHit[] }[] };
      return body.results
        .flatMap((r) => r.hits)
        .sort((a, b) => (b._rankingScore ?? 0) - (a._rankingScore ?? 0))
        .slice(0, limit)
        .map((h) => ({
          id: h.id,
          score: Math.round((h._rankingScore ?? 0.5) * 100) / 100,
          matchedBy: "trigram" as const,
        }));
    } catch (e) {
      this.log.warn(`Search fell back to Postgres: ${(e as Error).message}`);
      return this.fallback.search(q, limit);
    }
  }

  private readonly configured = new Set<string>();

  private async configure(index: string) {
    if (this.configured.has(index)) return;
    await fetch(`${this.host}/indexes/${index}/settings`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({
        searchableAttributes: [
          "fullName",
          "lastName",
          "firstName",
          "middleName",
          "lastKey",
          "firstKey",
          "middleKey",
        ],
        filterableAttributes: ["custodyStatus"],
      }),
    });
    this.configured.add(index);
  }

  /** Pushes folios to their state shards: one import's rows, or every row. */
  async sync(db: PrismaClient, scope: { ingestionJobId?: string } = {}): Promise<number> {
    let cursor: string | undefined;
    let total = 0;
    for (;;) {
      const batch = await db.unclaimedFolio.findMany({
        where: {
          ...(scope.ingestionJobId ? { ingestionJobId: scope.ingestionJobId } : {}),
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        take: 5000,
        orderBy: { id: "asc" },
        select: {
          id: true,
          state: true,
          custodyStatus: true,
          fullNameNorm: true,
          firstNameNorm: true,
          middleNameNorm: true,
          lastNameNorm: true,
          firstNameKey: true,
          middleNameKey: true,
          lastNameKey: true,
        },
      });
      if (!batch.length) break;
      const byIndex = new Map<string, object[]>();
      for (const f of batch) {
        const index = MeiliSearchEngine.indexFor(f.state);
        byIndex.set(index, [
          ...(byIndex.get(index) ?? []),
          {
            id: f.id,
            custodyStatus: f.custodyStatus,
            fullName: f.fullNameNorm,
            firstName: f.firstNameNorm,
            middleName: f.middleNameNorm,
            lastName: f.lastNameNorm,
            firstKey: f.firstNameKey,
            middleKey: f.middleNameKey,
            lastKey: f.lastNameKey,
          },
        ]);
      }
      for (const [index, docs] of byIndex) {
        await this.configure(index);
        const res = await fetch(`${this.host}/indexes/${index}/documents?primaryKey=id`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(docs),
        });
        if (!res.ok) throw new Error(`Meilisearch rejected documents (${res.status}).`);
      }
      total += batch.length;
      cursor = batch[batch.length - 1]!.id;
    }
    return total;
  }
}
