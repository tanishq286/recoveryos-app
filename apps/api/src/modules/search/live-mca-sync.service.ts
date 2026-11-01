import { randomUUID } from "node:crypto";

import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  fetchBuffer,
  findStatementLinks,
  ingestStatement,
  robotsAllows,
  sleep,
  type FieldKeys,
  type PrismaClient,
} from "@recoveryos/db";
import type { IndianState } from "@recoveryos/shared";
import { Observable, Subject } from "rxjs";

import { ENV, type Env } from "../../config/env.js";
import { PrismaService } from "../../common/prisma.service.js";

/**
 * Live refresh behind every search. A search answers at once from the
 * partitioned index; at the same moment this service checks upstream
 * sources for statements filed since the last check, upserts any new
 * holders, and tells the searcher's session when it is done so the browser
 * can ask again. The browser only ever sees a refresh id and counts, never
 * where the data came from.
 *
 * Sources are pluggable (`UpstreamSource`). The one implemented reads the
 * IEPF-2 / IEPF-4 statements companies publish on their investor-relations
 * pages, honestly identified and within robots.txt. MCA's IEPF investor
 * search is CAPTCHA-protected and has no public API, so it is not scraped:
 * an authorised MCA or registrar feed would be added as another source.
 */
export interface UpstreamResult {
  filesChecked: number;
  inserted: number;
  updated: number;
}

export interface RefreshContext {
  state: IndianState;
  databaseUrl: string;
  keys: FieldKeys;
}

export interface UpstreamSource {
  readonly name: string;
  refresh(db: PrismaClient, ctx: RefreshContext): Promise<UpstreamResult>;
}

export type LiveEvent =
  | { type: "started" }
  | { type: "done"; filesChecked: number; newRecords: number; updatedRecords: number }
  | { type: "skipped"; reason: string };

/** Company-published statements: each company's IR page, at most once per TTL. */
export class CompanyStatementsSource implements UpstreamSource {
  readonly name = "company-statements";
  private readonly log = new Logger("LiveSync");
  private readonly lastChecked = new Map<string, number>();

  constructor(private readonly ttlMs: number) {}

  async refresh(db: PrismaClient, ctx: RefreshContext): Promise<UpstreamResult> {
    const out: UpstreamResult = { filesChecked: 0, inserted: 0, updated: 0 };
    const companies = await db.company.findMany({
      where: { irPageUrl: { not: null } },
      select: { id: true, name: true, irPageUrl: true },
    });
    for (const c of companies) {
      const last = this.lastChecked.get(c.id) ?? 0;
      if (Date.now() - last < this.ttlMs) continue;
      this.lastChecked.set(c.id, Date.now());
      try {
        if (!(await robotsAllows(c.irPageUrl!))) continue;
        const page = await fetchBuffer(c.irPageUrl!, 20_000);
        const links = findStatementLinks(page.buffer.toString("utf8"), page.finalUrl);
        const seen = new Set(
          (
            await db.ingestionJob.findMany({
              where: {
                companyId: c.id,
                status: "COMPLETED",
                sourceUrl: { in: links.map((l) => l.url) },
              },
              select: { sourceUrl: true },
            })
          ).map((j) => j.sourceUrl),
        );
        for (const link of links.filter((l) => !seen.has(l.url)).slice(0, 5)) {
          await sleep(1500);
          if (!(await robotsAllows(link.url))) continue;
          const file = await fetchBuffer(link.url);
          out.filesChecked++;
          const fileName = decodeURIComponent(
            new URL(file.finalUrl).pathname.split("/").pop() ?? "statement",
          );
          const job = await db.ingestionJob.create({
            data: {
              formType: "IEPF_2",
              fileName,
              storageKey: `url:${link.url}`,
              sourceUrl: link.url,
              companyId: c.id,
              status: "PROCESSING",
              startedAt: new Date(),
            },
          });
          try {
            const r = await ingestStatement(
              db,
              ctx.keys,
              { buffer: file.buffer, fileName, contentType: file.contentType },
              { companyId: c.id, jobId: job.id, databaseUrl: ctx.databaseUrl },
            );
            await db.ingestionJob.update({
              where: { id: job.id },
              data: {
                formType: r.form,
                status: "COMPLETED",
                totalRows: r.totalRows,
                insertedRows: r.insertedRows,
                updatedRows: r.updatedRows,
                skippedRows: r.skippedRows,
                errors: r.errors,
                finishedAt: new Date(),
              },
            });
            out.inserted += r.insertedRows;
            out.updated += r.updatedRows;
          } catch (e) {
            await db.ingestionJob.update({
              where: { id: job.id },
              data: {
                status: "FAILED",
                errors: [{ row: 0, message: (e as Error).message.slice(0, 500) }],
                finishedAt: new Date(),
              },
            });
          }
        }
      } catch (e) {
        this.log.warn(`${c.name}: ${(e as Error).message}`);
      }
    }
    return out;
  }
}

interface Run {
  subject: Subject<LiveEvent>;
  last: LiveEvent;
  expires: number;
}

@Injectable()
export class LiveMcaSyncService {
  private readonly log = new Logger("LiveSync");
  private readonly runs = new Map<string, Run>();
  private readonly sources: UpstreamSource[];
  private running: Promise<UpstreamResult> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.sources = [new CompanyStatementsSource(env.LIVE_SYNC_TTL_HOURS * 3_600_000)];
  }

  get enabled(): boolean {
    return this.env.LIVE_SYNC_ENABLED;
  }

  /** Starts (or joins) a refresh for this search and returns its id, or null when disabled. */
  trigger(state: IndianState): string | null {
    if (!this.enabled) return null;
    this.sweep();
    const id = randomUUID();
    const run: Run = {
      subject: new Subject<LiveEvent>(),
      last: { type: "started" },
      expires: Date.now() + 10 * 60_000,
    };
    this.runs.set(id, run);
    // One refresh at a time across the process; concurrent searches share it.
    this.running ??= this.refreshAll(state).finally(() => {
      this.running = null;
    });
    this.running.then(
      (r) =>
        this.emit(id, {
          type: "done",
          filesChecked: r.filesChecked,
          newRecords: r.inserted,
          updatedRecords: r.updated,
        }),
      (e: Error) => this.emit(id, { type: "skipped", reason: e.message }),
    );
    return id;
  }

  /** Server-sent events for one refresh; replays the latest state first. */
  events(id: string): Observable<LiveEvent> | null {
    const run = this.runs.get(id);
    if (!run) return null;
    return new Observable<LiveEvent>((sub) => {
      sub.next(run.last);
      if (run.last.type !== "started") {
        sub.complete();
        return;
      }
      const s = run.subject.subscribe(sub);
      return () => s.unsubscribe();
    });
  }

  private emit(id: string, event: LiveEvent) {
    const run = this.runs.get(id);
    if (!run) return;
    run.last = event;
    run.subject.next(event);
    run.subject.complete();
  }

  private async refreshAll(state: IndianState): Promise<UpstreamResult> {
    const total: UpstreamResult = { filesChecked: 0, inserted: 0, updated: 0 };
    for (const source of this.sources) {
      const r = await source.refresh(this.prisma.client, {
        state,
        databaseUrl: this.prisma.databaseUrl,
        keys: this.prisma.fieldKeys,
      });
      total.filesChecked += r.filesChecked;
      total.inserted += r.inserted;
      total.updated += r.updated;
    }
    if (total.filesChecked)
      this.log.log(
        `Live refresh: ${total.filesChecked} new statement(s), ${total.inserted} new holders.`,
      );
    return total;
  }

  private sweep() {
    const now = Date.now();
    for (const [id, run] of this.runs) if (run.expires < now) this.runs.delete(id);
  }
}
