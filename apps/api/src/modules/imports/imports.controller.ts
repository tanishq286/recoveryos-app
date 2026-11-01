import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TEMPLATE_HEADERS } from "@finsol/db";
import { INGESTION_FORMS } from "@finsol/shared";
import { z } from "zod";

import { CurrentUser, Roles } from "../../common/auth/decorators.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { ImportsService } from "./imports.service.js";

const blankToUndefined = z.literal("").transform(() => undefined);
const uploadSchema = z.object({
  formType: z.enum(INGESTION_FORMS).optional().or(blankToUndefined),
  companySlug: z
    .string()
    .regex(/^[a-z0-9-]{2,120}$/)
    .optional()
    .or(blankToUndefined),
  sourceUrl: z.url().max(2000).optional().or(blankToUndefined),
});

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().min(3, "Say why.").max(500),
});

@Roles("SUPER_ADMIN", "LEGAL_OPS_EXEC")
@Controller("admin/ingestion")
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  /** Upload a real IEPF-2 or IEPF-4 statement (.xlsx, .xls, .csv or .pdf). Parsed in the background. */
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 41 * 1024 * 1024, files: 1 } }))
  upload(
    @Body({ schema: uploadSchema }) body: z.infer<typeof uploadSchema>,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.imports.upload(user, body.formType, file, body.companySlug, body.sourceUrl);
  }

  @Get()
  list() {
    return this.imports.list();
  }

  @Get("template.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="iepf-investor-statement-columns.csv"')
  template() {
    return TEMPLATE_HEADERS.map((h) => `"${h}"`).join(",") + "\n";
  }

  /** Aggregate coverage, freshness and import health (counts only). */
  @Get("coverage")
  coverage() {
    return this.imports.coverage();
  }

  /** Quarantined source rows awaiting review, with their raw cells (staff only, audited). */
  @Get("quarantine")
  quarantine(
    @Query({ schema: z.object({ document: z.uuid().optional() }) }) q: { document?: string },
    @CurrentUser() user: SessionClaims,
  ) {
    return this.imports.quarantine(user, q.document);
  }

  /** Publish (APPROVED) or withdraw (REJECTED) the holder record behind a quarantined row. */
  @Post("quarantine/:rowId")
  @HttpCode(200)
  review(
    @Param("rowId", { schema: z.uuid() }) rowId: string,
    @Body({ schema: reviewSchema }) body: z.infer<typeof reviewSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.imports.reviewRow(user, rowId, body.decision, body.note);
  }

  @Post(":id/retry")
  @HttpCode(200)
  retry(@Param("id", { schema: z.uuid() }) id: string, @CurrentUser() user: SessionClaims) {
    return this.imports.retry(user, id);
  }

  @Get(":id")
  view(@Param("id", { schema: z.uuid() }) id: string) {
    return this.imports.view(id);
  }
}
