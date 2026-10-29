import { Logger } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@recoveryos/db";
import { phoneticKeys, type ResolvedSearch } from "@recoveryos/shared";

export interface SearchHit {
  id: string;
  score: number;
  matchedBy: "exact" | "trigram" | "phonetic" | "soundex";
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
 * Fuzzy search in Postgres. Every name part given must match by at least
 * one of: trigram similarity (pg_trgm `%`), our Indian phonetic key, or
 * Soundex with a small Levenshtein distance (fuzzystrmatch). A single letter
 * ("K") matches as an initial. Results are scoped to one state, plus holders
 * whose statement gives no state at all (they rank on the name alone).
 */
export class PostgresSearchEngine implements SearchEngine {
  readonly name = "postgres" as const;
  constructor(private readonly db: PrismaClient) {}

  async search(q: ResolvedSearch, limit: number): Promise<SearchHit[]> {
    const parts = (["first", "middle", "last"] as const).filter((p) => q[p]);
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
        OR ${key} = ${k}
        OR (soundex(${norm}) = soundex(${value}) AND levenshtein(${norm}, ${value}) <= 3)
      )`);
      scores.push(Prisma.sql`GREATEST(
        similarity(${norm}, ${value}),
        CASE WHEN ${key} = ${k} THEN 0.86 ELSE 0 END,
        CASE WHEN soundex(${norm}) = soundex(${value})
          THEN GREATEST(0, 0.8 - 0.1 * levenshtein(${norm}, ${value})) ELSE 0 END
      )`);
      exact.push(Prisma.sql`(${norm} = ${value})`);
      phonetic.push(Prisma.sql`(${key} = ${k})`);
    }
    const custody = q.custodyStatus
      ? Prisma.sql`AND f.custody_status = ${q.custodyStatus}::"CustodyStatus"`
      : Prisma.empty;
    const rows = await this.db.$queryRaw<
      { id: string; score: number; exact: boolean; phonetic: boolean; trigram: number }[]
    >`
      SELECT f.id,
             (${Prisma.join(scores, " + ")}) / ${parts.length}::float AS score,
             (${Prisma.join(exact, " AND ")}) AS exact,
             (${Prisma.join(phonetic, " AND ")}) AS phonetic,
             similarity(f.full_name_norm, ${[q.first, q.middle, q.last].filter(Boolean).join(" ")}) AS trigram
      FROM unclaimed_folios f
      WHERE (f.state = ${q.state}::"IndianState" OR f.state = 'UNKNOWN'::"IndianState")
        ${custody}
        AND ${Prisma.join(conditions, " AND ")}
      ORDER BY score DESC, trigram DESC, f.post_action_shares DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      id: r.id,
      score: Math.round(Math.min(1, Number(r.score)) * 100) / 100,
      matchedBy: r.exact
        ? "exact"
        : Number(r.score) >= 0.6 && Number(r.trigram) >= 0.5
          ? "trigram"
          : r.phonetic
            ? "phonetic"
            : "soundex",
    }));
  }
}

interface MeiliHit {
  id: string;
  _rankingScore?: number;
}

/**
 * Meilisearch for sub-50 ms queries at scale. Documents carry the phonetic
 * keys as well as the names, so a key match ranks like a typo-tolerant hit.
 * Falls back to Postgres on any error, so search never goes down with it.
 */
export class MeiliSearchEngine implements SearchEngine {
  readonly name = "meilisearch" as const;
  private readonly log = new Logger("Meilisearch");
  static readonly INDEX = "unclaimed_folios";

  constructor(
    private readonly host: string,
    private readonly apiKey: string | undefined,
    private readonly fallback: PostgresSearchEngine,
  ) {}

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
      const filter = [
        `state = "${q.state}"`,
        q.custodyStatus ? `custodyStatus = "${q.custodyStatus}"` : null,
      ]
        .filter(Boolean)
        .join(" AND ");
      const res = await fetch(`${this.host}/indexes/${MeiliSearchEngine.INDEX}/search`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          q: [...words, ...keys].join(" "),
          filter,
          limit,
          showRankingScore: true,
          matchingStrategy: "all",
        }),
        signal: AbortSignal.timeout(800),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { hits: MeiliHit[] };
      return body.hits.map((h) => ({
        id: h.id,
        score: Math.round((h._rankingScore ?? 0.5) * 100) / 100,
        matchedBy: "trigram" as const,
      }));
    } catch (e) {
      this.log.warn(`Search fell back to Postgres: ${(e as Error).message}`);
      return this.fallback.search(q, limit);
    }
  }

  /** Pushes folios to the index (all of them when no ids are given). */
  async sync(db: PrismaClient, folioIds?: string[]): Promise<number> {
    await fetch(`${this.host}/indexes/${MeiliSearchEngine.INDEX}/settings`, {
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
        filterableAttributes: ["state", "custodyStatus"],
      }),
    });
    let cursor: string | undefined;
    let total = 0;
    for (;;) {
      const batch = await db.unclaimedFolio.findMany({
        where: folioIds ? { id: { in: folioIds } } : undefined,
        take: 1000,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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
      const docs = batch.map((f) => ({
        id: f.id,
        state: f.state,
        custodyStatus: f.custodyStatus,
        fullName: f.fullNameNorm,
        firstName: f.firstNameNorm,
        middleName: f.middleNameNorm,
        lastName: f.lastNameNorm,
        firstKey: f.firstNameKey,
        middleKey: f.middleNameKey,
        lastKey: f.lastNameKey,
      }));
      const res = await fetch(
        `${this.host}/indexes/${MeiliSearchEngine.INDEX}/documents?primaryKey=id`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(docs),
        },
      );
      if (!res.ok) throw new Error(`Meilisearch rejected documents (${res.status}).`);
      total += batch.length;
      cursor = batch[batch.length - 1]!.id;
    }
    return total;
  }
}
