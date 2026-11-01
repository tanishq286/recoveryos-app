import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { maskPhone } from "@recoveryos/shared";

import { PrismaService } from "../prisma.service.js";
import { ImportsService } from "../../modules/imports/imports.service.js";
import { SEARCH_ENGINE } from "../../modules/search/search.tokens.js";
import { MeiliSearchEngine, type SearchEngine } from "../../modules/search/search-engine.js";
import { JobQueueService } from "./job-queue.service.js";
import type { JobHandlers } from "./jobs.js";

/** The processors for every background job, used by the worker and by inline mode. */
@Injectable()
export class JobHandlersService implements OnModuleInit {
  private readonly log = new Logger("Jobs");

  constructor(
    private readonly prisma: PrismaService,
    private readonly imports: ImportsService,
    private readonly queue: JobQueueService,
    @Inject(SEARCH_ENGINE) private readonly engine: SearchEngine,
  ) {}

  onModuleInit() {
    if (this.queue.mode === "inline") this.queue.registerInlineHandlers(this.handlers);
  }

  readonly handlers: JobHandlers = {
    "ingestion.process": async ({ jobId }) => this.imports.process(jobId),
    "search.sync": async ({ ingestionJobId }) => {
      if (this.engine instanceof MeiliSearchEngine) {
        const n = await this.engine.sync(this.prisma.client, { ingestionJobId });
        this.log.log(`Indexed ${n} folios in Meilisearch.`);
      }
      // Postgres search reads the table directly; nothing to sync.
    },
    "lead.notify-analyst": async ({ leadId }) => {
      const lead = await this.prisma.client.leadInquiry.findUnique({
        where: { id: leadId },
        include: { assignedAnalyst: true },
      });
      if (!lead) return;
      // Hook for email, WhatsApp Business or Slack. The analyst also sees the lead on the CRM board.
      this.log.log(
        `New claim request for ${lead.assignedAnalyst?.name ?? "the unassigned queue"}: ${lead.claimantName} (${maskPhone(lead.phone)}), ${lead.matchedFolioIds.length} holding(s), estimate ₹${(Number(lead.estimatedValuePaise) / 100).toLocaleString("en-IN")}.`,
      );
    },
  };
}
