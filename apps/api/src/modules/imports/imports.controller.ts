import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TEMPLATE_HEADERS } from "@recoveryos/db";
import { INGESTION_FORMS } from "@recoveryos/shared";
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

  @Get(":id")
  view(@Param("id", { schema: z.uuid() }) id: string) {
    return this.imports.view(id);
  }
}
