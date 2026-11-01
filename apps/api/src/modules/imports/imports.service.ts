import { randomUUID } from "node:crypto";

import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { formatOf, ingestStatement, mapHeaders, readStatement } from "@finsol/db";
import type { IngestionForm } from "@finsol/shared";

import { AuditService } from "../../common/audit.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { DOCUMENT_STORAGE, type DocumentStorage } from "../../common/providers/storage.provider.js";
import { JobQueueService } from "../../common/queue/job-queue.service.js";
import { isoTime } from "../../common/serialize.js";

const MAX_FILE_MB = 40;

/**
 * Admin importer for real IEPF-2 / IEPF-4 statements (.xlsx, .xls, .csv,
 * .pdf). Parsing is the same code the `ingest:iepf` CLI runs
 * (packages/db/src/ingest-iepf.ts); this service stores the file, queues the
 * job and records its outcome.
 */
@Injectable()
export class ImportsService {
  private readonly log = new Logger("Imports");

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobQueueService,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
  ) {}

  async upload(
    user: SessionClaims,
    form: IngestionForm | undefined,
    file: { originalname: string; buffer: Buffer; size: number; mimetype?: string } | undefined,
    companySlug?: string,
    sourceUrl?: string,
  ) {
    if (!file) throw new BadRequestException("Attach the statement: .xlsx, .xls, .csv or .pdf.");
    if (!formatOf(file.originalname, file.mimetype))
      throw new BadRequestException("Upload a .xlsx, .xls, .csv or .pdf statement.");
    if (file.size > MAX_FILE_MB * 1024 * 1024)
      throw new BadRequestException(`Files can be up to ${MAX_FILE_MB} MB.`);
    let companyId: string | null = null;
    if (companySlug) {
      const c = await this.prisma.client.company.findUnique({ where: { slug: companySlug } });
      if (!c) throw new BadRequestException("Unknown company.");
      companyId = c.id;
    }
    // Read the header now, so a wrong file fails at upload rather than in the queue.
    try {
      const table = await readStatement(file.buffer, file.originalname, file.mimetype);
      const { map } = mapHeaders(table.headers);
      if (map.first === undefined && map.fullName === undefined && map.last === undefined)
        throw new Error("No investor name column was found.");
      if (!companyId && map.cin === undefined && map.companyName === undefined)
        throw new Error("Choose the company, or include a CIN or company name column.");
      form ??= map.shares !== undefined ? "IEPF_4" : "IEPF_2";
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const safeName = file.originalname.replace(/[^\w.-]+/g, "_");
    const storageKey = await this.storage.put(
      `imports/${randomUUID()}-${safeName}`,
      file.buffer,
      file.mimetype ?? "application/octet-stream",
    );
    const job = await this.prisma.client.ingestionJob.create({
      data: {
        formType: form,
        fileName: file.originalname,
        storageKey,
        sourceUrl: sourceUrl || null,
        companyId,
        uploadedById: user.sub,
      },
    });
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "imports.upload",
      entityType: "ingestion_job",
      entityId: job.id,
      data: { form, fileName: file.originalname, sourceUrl },
    });
    await this.jobs.enqueue("ingestion.process", { jobId: job.id });
    return this.view(job.id);
  }

  async list() {
    const jobs = await this.prisma.client.ingestionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { uploadedBy: { select: { name: true } } },
    });
    return jobs.map((j) => this.shape(j));
  }

  async view(id: string) {
    const job = await this.prisma.client.ingestionJob.findUnique({
      where: { id },
      include: { uploadedBy: { select: { name: true } } },
    });
    if (!job) throw new NotFoundException("No such import.");
    return this.shape(job);
  }

  private shape(
    j: Awaited<ReturnType<typeof this.prisma.client.ingestionJob.findUniqueOrThrow>> & {
      uploadedBy?: { name: string } | null;
    },
  ) {
    return {
      id: j.id,
      formType: j.formType,
      fileName: j.fileName,
      sourceUrl: j.sourceUrl,
      status: j.status,
      totalRows: j.totalRows,
      insertedRows: j.insertedRows,
      updatedRows: j.updatedRows,
      skippedRows: j.skippedRows,
      errors: (j.errors as { row: number; message: string }[] | null) ?? [],
      uploadedBy:
        j.uploadedBy?.name ??
        (j.storageKey.startsWith("cli:") || j.storageKey.startsWith("file:")
          ? "Command line"
          : null),
      createdAt: isoTime(j.createdAt),
      startedAt: isoTime(j.startedAt),
      finishedAt: isoTime(j.finishedAt),
    };
  }

  /** The job body. Runs in the worker (BullMQ) or inline. Safe to re-run: rows upsert. */
  async process(jobId: string): Promise<void> {
    const db = this.prisma.client;
    const job = await db.ingestionJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });
    try {
      const buffer = await this.storage.get(job.storageKey);
      const r = await ingestStatement(
        db,
        this.prisma.fieldKeys,
        { buffer, fileName: job.fileName },
        {
          companyId: job.companyId,
          form: job.formType,
          jobId: job.id,
          databaseUrl: this.prisma.databaseUrl,
        },
      );
      await db.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          totalRows: r.totalRows,
          insertedRows: r.insertedRows,
          updatedRows: r.updatedRows,
          skippedRows: r.skippedRows,
          errors: r.errors,
          finishedAt: new Date(),
        },
      });
      if (r.insertedRows + r.updatedRows)
        await this.jobs.enqueue("search.sync", { ingestionJobId: job.id });
      this.log.log(
        `${job.fileName}: ${r.insertedRows} new, ${r.updatedRows} updated, ${r.skippedRows} skipped of ${r.totalRows}.`,
      );
    } catch (e) {
      await db.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errors: [{ row: 0, message: (e as Error).message }],
          finishedAt: new Date(),
        },
      });
      throw e;
    }
  }
}
