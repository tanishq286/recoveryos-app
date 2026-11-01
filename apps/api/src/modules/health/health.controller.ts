import { Controller, Get, Inject } from "@nestjs/common";

import { Public } from "../../common/auth/decorators.js";
import { PrismaService } from "../../common/prisma.service.js";
import { JobQueueService } from "../../common/queue/job-queue.service.js";
import { ESIGN_PROVIDER, type EsignProvider } from "../../common/providers/esign.provider.js";
import { OTP_SENDER, type OtpSender } from "../../common/providers/otp.provider.js";
import { DOCUMENT_STORAGE, type DocumentStorage } from "../../common/providers/storage.provider.js";
import { SEARCH_ENGINE } from "../search/search.tokens.js";
import type { SearchEngine } from "../search/search-engine.js";

/** Liveness plus which adapter each integration is running on. */
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobQueueService,
    @Inject(OTP_SENDER) private readonly otp: OtpSender,
    @Inject(ESIGN_PROVIDER) private readonly esign: EsignProvider,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    @Inject(SEARCH_ENGINE) private readonly search: SearchEngine,
  ) {}

  @Public()
  @Get()
  async health() {
    await this.prisma.client.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      adapters: {
        otp: this.otp.name,
        esign: this.esign.name,
        storage: this.storage.name,
        search: this.search.name,
        jobs: this.jobs.mode,
      },
    };
  }
}
