import { randomBytes, randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Res,
} from "@nestjs/common";
import {
  maskPhone,
  MIN_PURCHASE_YEAR,
  portfolioTotals,
  valueHolding,
  type HoldingValuation,
} from "@recoveryos/shared";
import type { Response } from "express";
import { z } from "zod";

import { ENV, type Env } from "../../config/env.js";
import { AuditService } from "../../common/audit.service.js";
import { CurrentUser } from "../../common/auth/decorators.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import { EquitiesService } from "../../market/equities.service.js";
import { buildValuationPdf } from "./valuation-pdf.js";

const reportSchema = z.object({
  holdings: z
    .array(
      z.object({
        symbol: z.string().regex(/^[A-Za-z0-9&._-]{1,20}$/),
        exchange: z.enum(["NSE", "BSE"]),
        purchaseYear: z.number().int().min(MIN_PURCHASE_YEAR).max(new Date().getUTCFullYear()),
        originalShares: z.number().int().min(1).max(10_000_000),
        /** Only when the visitor overrode the synced price. */
        manualPrice: z.number().positive().max(10_000_000).nullable().optional(),
      }),
    )
    .min(1)
    .max(20),
});

/**
 * POST /api/v1/valuation/report: the calculator's Share Valuation Report.
 * Signed-in only (the Login Gateway verified the mobile by OTP), at most
 * VALUATION_REPORTS_PER_DAY per mobile number. Every figure is recomputed
 * here from the same price and event history the calculator shows.
 */
@Controller("valuation")
export class ValuationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equities: EquitiesService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post("report")
  @HttpCode(200)
  async report(
    @Body({ schema: reportSchema }) body: z.infer<typeof reportSchema>,
    @CurrentUser() claims: SessionClaims,
    @Res() res: Response,
  ) {
    const db = this.prisma.client;
    const user = await db.user.findUniqueOrThrow({ where: { id: claims.sub } });
    const today = await db.valuationReport.count({
      where: { phone: user.phone, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    });
    if (today >= this.env.VALUATION_REPORTS_PER_DAY)
      throw new HttpException(
        `Each mobile number can download ${this.env.VALUATION_REPORTS_PER_DAY} reports a day. Try again tomorrow, or ask your analyst.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );

    const rows: HoldingValuation[] = [];
    const notes: string[] = [];
    for (const h of body.holdings) {
      const d = await this.equities.detail(h.symbol, h.exchange);
      const manual = h.manualPrice ?? null;
      rows.push(
        valueHolding(
          {
            symbol: d.symbol,
            exchange: d.exchange,
            name: d.name,
            purchaseYear: h.purchaseYear,
            originalShares: h.originalShares,
            pricePerShare: manual ?? d.price,
            priceIsManual: manual !== null,
          },
          d.actions,
          d.dividends,
        ),
      );
      notes.push(
        manual !== null
          ? "Price entered by the client."
          : d.price === null
            ? "No market price available."
            : `Price: ${d.priceSource ?? "market data"}, ${d.priceUpdatedAt?.replace("T", " ").slice(0, 16) ?? "time unknown"} UTC. ${d.actionsBasis === "verified" ? "Bonus/split history verified against company filings." : "Bonus/split history from the exchange record."}`,
      );
    }
    const totals = portfolioTotals(rows);
    const issuedAt = new Date();
    const reportCode = `FE-VAL-${issuedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
    await db.valuationReport.create({
      data: {
        id: randomUUID(),
        reportCode,
        userId: user.id,
        phone: user.phone,
        holdings: rows as never,
        totalValuePaise: BigInt(totals.totalPaise),
      },
    });
    await this.audit.record({
      actorId: user.id,
      actorRole: user.role,
      action: "valuation.report",
      entityType: "valuation_report",
      entityId: reportCode,
      data: { holdings: rows.length, totalPaise: totals.totalPaise },
    });
    const pdf = await buildValuationPdf({
      reportCode,
      issuedAt,
      preparedFor: { name: user.name, phoneMasked: maskPhone(user.phone), email: user.email },
      rows,
      totals,
      priceNotes: notes,
    });
    res
      .status(200)
      .setHeader("content-type", "application/pdf")
      .setHeader("content-disposition", `attachment; filename="${reportCode}.pdf"`)
      .setHeader("x-report-code", reportCode)
      .setHeader("x-reports-left-today", String(this.env.VALUATION_REPORTS_PER_DAY - today - 1))
      .send(pdf);
  }
}
