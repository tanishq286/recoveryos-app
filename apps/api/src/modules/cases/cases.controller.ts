import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DOC_TYPES, TRACK_STATUSES, type DocType } from "@recoveryos/shared";
import type { Response } from "express";
import { z } from "zod";

import { CurrentUser, Public, Roles, type AuthedRequest } from "../../common/auth/decorators.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { CasesService, type UploadedFile as File } from "./cases.service.js";

const code = z.string().regex(/^RC-\d{4}-\d{4,6}$/i, "Not a case code.");
const docType = z.enum(DOC_TYPES);
const feeSchema = z.object({ feePct: z.number().gt(0).max(50) });

const advanceSchema = z.object({ toStep: z.number().int().min(1).max(7) });
const trackingSchema = z.object({
  rtaEntitlementStatus: z.enum(TRACK_STATUSES).optional(),
  nodalVerificationStatus: z.enum(TRACK_STATUSES).optional(),
  dematCreditStatus: z.enum(TRACK_STATUSES).optional(),
  mcaIepf5Srn: z.string().trim().max(20).optional(),
  creditedValueRupees: z.number().nonnegative().max(1e11).optional(),
});
const reviewSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  comment: z.string().trim().max(500).optional(),
});
const mockSignSchema = z.object({
  aadhaarLast4: z.string().regex(/^\d{4}$/),
  otp: z.string().regex(/^\d{6}$/),
});

function sendFile(res: Response, body: Buffer, type: string, name: string, inline = true) {
  res.set({
    "Content-Type": type,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  return new StreamableFile(body);
}

@Controller("cases")
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  list(@CurrentUser() user: SessionClaims) {
    return this.cases.list(user);
  }

  @Get(":code")
  get(@Param("code", { schema: code }) c: string, @CurrentUser() user: SessionClaims) {
    return this.cases.get(c, user);
  }

  @Roles("VALUATION_ANALYST", "LEGAL_OPS_EXEC")
  @Post(":code/advance")
  @HttpCode(200)
  advance(
    @Param("code", { schema: code }) c: string,
    @Body({ schema: advanceSchema }) body: z.infer<typeof advanceSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.cases.advance(c, user, body.toStep);
  }

  @Roles("VALUATION_ANALYST", "LEGAL_OPS_EXEC")
  @Patch(":code/tracking")
  tracking(
    @Param("code", { schema: code }) c: string,
    @Body({ schema: trackingSchema }) body: z.infer<typeof trackingSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.cases.updateTracking(c, user, body);
  }

  /** Custom pricing: the case team sets the fee before the Digital Mandate is issued. */
  @Roles("VALUATION_ANALYST", "LEGAL_OPS_EXEC")
  @Patch(":code/fee")
  setFee(
    @Param("code", { schema: code }) c: string,
    @Body({ schema: feeSchema }) body: z.infer<typeof feeSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.cases.setFee(c, user, body.feePct);
  }

  /** Reveals the folio number to the client. */
  @Roles("VALUATION_ANALYST", "LEGAL_OPS_EXEC")
  @Post(":code/release-folio")
  @HttpCode(200)
  releaseFolio(@Param("code", { schema: code }) c: string, @CurrentUser() user: SessionClaims) {
    return this.cases.releaseFolio(c, user);
  }

  @Post(":code/esign/start")
  @HttpCode(200)
  startEsign(@Param("code", { schema: code }) c: string, @CurrentUser() user: SessionClaims) {
    return this.cases.startEsign(c, user);
  }

  @Post(":code/esign/mock-complete")
  @HttpCode(200)
  mockComplete(
    @Param("code", { schema: code }) c: string,
    @Body({ schema: mockSignSchema }) body: z.infer<typeof mockSignSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.cases.completeMockEsign(c, user, body.aadhaarLast4, body.otp);
  }

  @Get(":code/mandate")
  async mandate(
    @Param("code", { schema: code }) c: string,
    @CurrentUser() user: SessionClaims,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdf = await this.cases.mandatePdf(c, user);
    return sendFile(res, pdf.body, "application/pdf", pdf.fileName);
  }

  @Post(":code/documents/:docType")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 25 * 1024 * 1024, files: 1 } }))
  upload(
    @Param("code", { schema: code }) c: string,
    @Param("docType", { schema: docType }) d: DocType,
    @UploadedFile() file: File | undefined,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.cases.upload(c, d, file, user);
  }

  @Roles("VALUATION_ANALYST", "LEGAL_OPS_EXEC")
  @Patch(":code/documents/:docType")
  review(
    @Param("code", { schema: code }) c: string,
    @Param("docType", { schema: docType }) d: DocType,
    @Body({ schema: reviewSchema }) body: z.infer<typeof reviewSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.cases.review(c, d, user, body.status, body.comment);
  }

  @Get(":code/documents/:docType/file")
  async file(
    @Param("code", { schema: code }) c: string,
    @Param("docType", { schema: docType }) d: DocType,
    @CurrentUser() user: SessionClaims,
    @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.cases.download(c, d, user);
    return sendFile(res, f.body, f.mimeType, f.fileName);
  }
}

/** Provider callbacks. Verified by signature, never by session. */
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly cases: CasesService) {}

  @Public()
  @Post("esign/:provider")
  @HttpCode(200)
  esign(@Param("provider") provider: string, @Req() req: AuthedRequest) {
    return this.cases.handleWebhook(provider, req.rawBody, req.headers);
  }
}
