import { createHash, randomUUID } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { decryptField, type Prisma } from "@recoveryos/db";
import {
  associateCommission,
  canAdvanceRecoverStep,
  CUSTODY_LABELS,
  documentChecklist,
  DOC_TYPE_LABELS,
  holdingValuePaise,
  netRealization,
  pctToBps,
  recoverStep,
  RECOVER_STEPS,
  RTA_LABELS,
  SCENARIO_LABELS,
  SCENARIO_TIMELINE_MONTHS,
  STAFF_ROLES,
  type DocType,
  type TrackStatus,
} from "@recoveryos/shared";

import { ENV, type Env } from "../../config/env.js";
import { AuditService } from "../../common/audit.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { DOCUMENT_STORAGE, type DocumentStorage } from "../../common/providers/storage.provider.js";
import {
  ESIGN_PROVIDER,
  MockEsignProvider,
  type EsignProvider,
} from "../../common/providers/esign.provider.js";
import { isoTime, num } from "../../common/serialize.js";
import { buildMandatePdf, stampSigned } from "./mandate-pdf.js";

type CaseFull = Prisma.RecoveryCaseGetPayload<{
  include: {
    company: true;
    folio: true;
    client: true;
    associate: { include: { user: true } };
    documents: true;
    events: { include: { actor: true } };
    lead: true;
  };
}>;

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const isStaff = (u: SessionClaims) => (STAFF_ROLES as readonly string[]).includes(u.role);

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    @Inject(ESIGN_PROVIDER) private readonly esign: EsignProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /* ── Access ─────────────────────────────────────────────────────────── */

  private async load(code: string): Promise<CaseFull> {
    const c = await this.prisma.client.recoveryCase.findUnique({
      where: { caseCode: code.toUpperCase() },
      include: {
        company: true,
        folio: true,
        client: true,
        associate: { include: { user: true } },
        documents: true,
        events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
        lead: true,
      },
    });
    if (!c) throw new NotFoundException("No case with that code.");
    return c;
  }

  /** Clients see their own cases, associates the cases they referred (read-only), staff everything. */
  private async access(
    code: string,
    user: SessionClaims,
    mode: "read" | "client-write" | "staff-write",
  ): Promise<CaseFull> {
    const c = await this.load(code);
    const staff = isStaff(user);
    const owner = c.clientUserId === user.sub;
    const referrer = c.associate?.userId === user.sub;
    const ok =
      mode === "read"
        ? staff || owner || referrer
        : mode === "client-write"
          ? owner || staff
          : staff;
    // Not-found rather than forbidden, so case codes cannot be probed.
    if (!ok)
      throw mode === "staff-write" && (owner || referrer)
        ? new ForbiddenException("Only the case team can do this.")
        : new NotFoundException("No case with that code.");
    return c;
  }

  private async event(
    caseId: string,
    actorId: string | null,
    kind: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    await this.prisma.client.caseEvent.create({
      data: { caseId, actorId, kind, message, data: data as never },
    });
  }

  /* ── Views ──────────────────────────────────────────────────────────── */

  private summary(
    c: Pick<
      CaseFull,
      "caseCode" | "recoverStep" | "scenarioType" | "esignStatus" | "updatedAt" | "createdAt"
    > & { company: { name: string; slug: string }; client: { name: string } },
  ) {
    const step = recoverStep(c.recoverStep);
    return {
      caseCode: c.caseCode,
      clientName: c.client.name,
      companyName: c.company.name,
      companySlug: c.company.slug,
      scenarioType: c.scenarioType,
      scenarioLabel: SCENARIO_LABELS[c.scenarioType],
      recoverStep: c.recoverStep,
      recoverStepName: step.name,
      esignStatus: c.esignStatus,
      createdAt: isoTime(c.createdAt),
      updatedAt: isoTime(c.updatedAt),
    };
  }

  async list(user: SessionClaims) {
    const where: Prisma.RecoveryCaseWhereInput = isStaff(user)
      ? {}
      : user.role === "ASSOCIATE_PARTNER"
        ? { OR: [{ associate: { userId: user.sub } }, { clientUserId: user.sub }] }
        : { clientUserId: user.sub };
    const cases = await this.prisma.client.recoveryCase.findMany({
      where,
      include: {
        company: { select: { name: true, slug: true } },
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return cases.map((c) => this.summary(c));
  }

  async get(code: string, user: SessionClaims) {
    const c = await this.access(code, user, "read");
    const showFolio = isStaff(user) || c.clientUserId === user.sub;
    const shares = c.folio?.postActionShares ?? 0;
    const price = c.company.currentMarketPrice === null ? null : num(c.company.currentMarketPrice);
    const estimatePaise = c.folio
      ? holdingValuePaise(shares, price ?? 0) + Math.round(num(c.folio.unclaimedDividendAmount) * 100)
      : 0;
    const feeBps = pctToBps(num(c.agreedSuccessFeePct));
    const basis = c.creditedValuePaise !== null ? Number(c.creditedValuePaise) : estimatePaise;
    const checklist = documentChecklist({
      scenario: c.scenarioType,
      certStatus: c.lead?.physicalCertStatus ?? "AVAILABLE",
    });
    const docs = new Map(c.documents.map((d) => [d.docType, d]));
    const vault = checklist.map((item) => {
      const d = docs.get(item.docType);
      return {
        docType: item.docType,
        label: DOC_TYPE_LABELS[item.docType],
        reason: item.reason,
        beforeFiling: item.beforeFiling,
        status: d?.status ?? "PENDING",
        fileName: d?.fileName ?? null,
        sizeBytes: d?.sizeBytes ?? null,
        sha256: d?.sha256 ?? null,
        reviewerComment: d?.reviewerComment ?? null,
        uploadedAt: isoTime(d?.uploadedAt),
        reviewedAt: isoTime(d?.reviewedAt),
        // Test-fixture records have no stored file behind them.
        hasFile: !!d?.s3Url && !d.s3Url.startsWith("seed://"),
      };
    });
    const required = vault.filter((v) => v.beforeFiling);
    return {
      ...this.summary(c),
      viewerRole: isStaff(user) ? "staff" : c.clientUserId === user.sub ? "client" : "associate",
      client: { name: c.client.name, phone: showFolio ? c.client.phone : null },
      associate: c.associate
        ? { firmName: c.associate.firmName, name: c.associate.user.name }
        : null,
      company: {
        name: c.company.name,
        slug: c.company.slug,
        rtaLabel: c.company.rtaDisplayName ?? RTA_LABELS[c.company.rtaName],
        rtaAddress: c.company.rtaAddress,
        nodalOfficerName: c.company.nodalOfficerName,
        nodalOfficerEmail: c.company.nodalOfficerEmail,
        nodalOfficerPhone: c.company.nodalOfficerPhone,
      },
      holding: c.folio
        ? {
            holderName: c.folio.investorFullName,
            folioNumber: showFolio
              ? decryptField(c.folio.folioNumber, this.prisma.fieldKeys)
              : c.folio.folioNumberMasked,
            certificateNumbers: showFolio ? c.folio.certificateNumbers : null,
            originalShares: c.folio.originalShares,
            postActionShares: shares,
            unclaimedDividendPaise: Math.round(num(c.folio.unclaimedDividendAmount) * 100),
            custodyStatus: c.folio.custodyStatus,
            custodyLabel: CUSTODY_LABELS[c.folio.custodyStatus],
            transferFinancialYear: c.folio.transferFinancialYear,
          }
        : null,
      steps: RECOVER_STEPS.map((s) => ({
        ...s,
        state:
          s.step < c.recoverStep
            ? "done"
            : s.step === c.recoverStep
              ? c.recoverStep === 7 && c.dematCreditStatus === "DONE"
                ? "done"
                : "current"
              : "upcoming",
      })),
      tracking: {
        rtaEntitlementStatus: c.rtaEntitlementStatus,
        mcaIepf5Srn: c.mcaIepf5Srn,
        nodalVerificationStatus: c.nodalVerificationStatus,
        dematCreditStatus: c.dematCreditStatus,
      },
      esign: {
        status: c.esignStatus,
        signedAt: isoTime(c.esignSignedAt),
        provider: this.esign.name,
        requested: !!c.esignRequestId,
        hasMandate: !!c.esignMandateUrl,
      },
      money: {
        feePct: num(c.agreedSuccessFeePct),
        basis: c.creditedValuePaise !== null ? "credited" : "estimate",
        ...netRealization(basis, feeBps),
        sharePricePaise: price === null ? null : Math.round(price * 100),
        priceUpdatedAt: isoTime(c.company.priceUpdatedAt),
        priceSource: c.company.priceSource,
      },
      timelineMonths: SCENARIO_TIMELINE_MONTHS[c.scenarioType],
      vault,
      vaultProgress: {
        required: required.length,
        verified: required.filter((v) => v.status === "VERIFIED").length,
        uploaded: required.filter((v) => v.status === "UPLOADED").length,
        rejected: required.filter((v) => v.status === "REJECTED").length,
      },
      events: c.events.map((e) => ({
        id: e.id,
        kind: e.kind,
        message: e.message,
        actorName: e.actor?.name ?? null,
        createdAt: isoTime(e.createdAt),
      })),
    };
  }

  /* ── Staff actions ──────────────────────────────────────────────────── */

  async advance(code: string, user: SessionClaims, toStep: number) {
    const c = await this.access(code, user, "staff-write");
    const check = canAdvanceRecoverStep(c.recoverStep, toStep, {
      esignSigned: c.esignStatus === "SIGNED",
      srnFiled: !!c.mcaIepf5Srn,
    });
    if (!check.ok) throw new ConflictException(check.reason);
    // Conditional update guards against two people advancing at once.
    const res = await this.prisma.client.recoveryCase.updateMany({
      where: { id: c.id, recoverStep: c.recoverStep },
      data: { recoverStep: toStep },
    });
    if (res.count !== 1)
      throw new ConflictException("Someone else moved this case. Reload and try again.");
    const step = recoverStep(toStep);
    await this.event(c.id, user.sub, "step", `Moved to step ${toStep}: ${step.name}.`);
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "case.advance",
      entityType: "case",
      entityId: c.id,
      data: { from: c.recoverStep, to: toStep },
    });
    return this.get(code, user);
  }

  async updateTracking(
    code: string,
    user: SessionClaims,
    patch: {
      rtaEntitlementStatus?: TrackStatus;
      nodalVerificationStatus?: TrackStatus;
      dematCreditStatus?: TrackStatus;
      mcaIepf5Srn?: string;
      creditedValueRupees?: number;
    },
  ) {
    const c = await this.access(code, user, "staff-write");
    const data: Prisma.RecoveryCaseUpdateInput = {};
    const notes: string[] = [];
    if (patch.mcaIepf5Srn !== undefined) {
      const srn = patch.mcaIepf5Srn.trim().toUpperCase();
      if (!/^[A-Z][0-9]{8}$/.test(srn))
        throw new BadRequestException(
          "An MCA SRN is one letter and eight digits, such as T12345678.",
        );
      data.mcaIepf5Srn = srn;
      notes.push(`IEPF-5 SRN ${srn} recorded.`);
    }
    for (const key of [
      "rtaEntitlementStatus",
      "nodalVerificationStatus",
      "dematCreditStatus",
    ] as const) {
      if (patch[key] && patch[key] !== c[key]) {
        data[key] = patch[key];
        notes.push(
          `${key === "rtaEntitlementStatus" ? "Registrar entitlement" : key === "nodalVerificationStatus" ? "Nodal verification" : "Demat credit"}: ${patch[key]!.toLowerCase().replace(/_/g, " ")}.`,
        );
      }
    }
    if (patch.creditedValueRupees !== undefined) {
      if (patch.dematCreditStatus !== "DONE" && c.dematCreditStatus !== "DONE")
        throw new BadRequestException("Record the credited value only once the credit is done.");
      data.creditedValuePaise = BigInt(Math.round(patch.creditedValueRupees * 100));
      notes.push(`Credited value recorded.`);
    }
    if (!notes.length) return this.get(code, user);
    await this.prisma.client.recoveryCase.update({ where: { id: c.id }, data });
    for (const n of notes) await this.event(c.id, user.sub, "tracking", n);
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "case.tracking",
      entityType: "case",
      entityId: c.id,
      data: patch,
    });
    await this.accrueCommission(c.id);
    return this.get(code, user);
  }

  /** Once a referred case is credited, the associate's share of our fee goes on the ledger, once. */
  private async accrueCommission(caseId: string) {
    const db = this.prisma.client;
    const c = await db.recoveryCase.findUniqueOrThrow({
      where: { id: caseId },
      include: { associate: true },
    });
    if (!c.associate || c.dematCreditStatus !== "DONE" || c.creditedValuePaise === null) return;
    const exists = await db.commissionLedgerEntry.findFirst({
      where: { caseId, entryType: "ACCRUAL" },
    });
    if (exists) return;
    const fee = netRealization(
      Number(c.creditedValuePaise),
      pctToBps(num(c.agreedSuccessFeePct)),
    ).feePaise;
    const amount = associateCommission(fee, pctToBps(num(c.associate.revenueSharePct)));
    await db.commissionLedgerEntry.create({
      data: {
        associateId: c.associate.id,
        caseId,
        entryType: "ACCRUAL",
        amountPaise: BigInt(amount),
        description: `${num(c.associate.revenueSharePct)}% of the success fee on ${c.caseCode}`,
      },
    });
  }

  /* ── eSign (step 5) ─────────────────────────────────────────────────── */

  async startEsign(code: string, user: SessionClaims) {
    const c = await this.access(code, user, "client-write");
    if (c.recoverStep !== 5)
      throw new ConflictException("The mandate can be signed at step 5 (Verify).");
    if (c.esignStatus === "SIGNED") throw new ConflictException("The mandate is already signed.");
    const pdf = await buildMandatePdf({
      caseCode: c.caseCode,
      clientName: c.client.name,
      clientPhone: c.client.phone,
      companyName: c.company.name,
      folioMasked: c.folio?.folioNumberMasked ?? "not linked",
      scenario: c.scenarioType,
      feePct: num(c.agreedSuccessFeePct),
      issuedOn: new Date().toISOString().slice(0, 10),
    });
    const url = await this.storage.put(
      `cases/${c.id}/mandate/${randomUUID()}.pdf`,
      pdf,
      "application/pdf",
    );
    const req = await this.esign.createSignRequest({
      caseCode: c.caseCode,
      pdf,
      signer: { name: c.client.name, phone: c.client.phone, email: c.client.email },
      callbackUrl: `${this.env.API_PUBLIC_URL}/api/v1/webhooks/esign/${this.esign.name}`,
    });
    await this.prisma.client.recoveryCase.update({
      where: { id: c.id },
      data: { esignRequestId: req.requestId, esignMandateUrl: url },
    });
    await this.event(
      c.id,
      user.sub,
      "esign",
      "Scope of Work generated and sent for Aadhaar eSign.",
    );
    return {
      requestId: req.requestId,
      signUrl: req.signUrl,
      provider: this.esign.name,
      mode: req.signUrl ? "redirect" : "simulated",
    };
  }

  /** Development only: completes the simulated Aadhaar OTP step through the real webhook path. */
  async completeMockEsign(code: string, user: SessionClaims, aadhaarLast4: string, otp: string) {
    if (!(this.esign instanceof MockEsignProvider))
      throw new BadRequestException("Simulated signing is off; sign on the provider's page.");
    const c = await this.access(code, user, "client-write");
    if (!c.esignRequestId) throw new ConflictException("Start the eSign first.");
    if (!/^\d{4}$/.test(aadhaarLast4) || !/^\d{6}$/.test(otp))
      throw new BadRequestException("Enter the last 4 digits of Aadhaar and the 6-digit code.");
    const hook = this.esign.buildWebhook(c.esignRequestId);
    await this.handleWebhook(this.esign.name, Buffer.from(hook.body), {
      "x-recoveryos-signature": hook.signature,
    });
    return this.get(code, user);
  }

  async handleWebhook(
    provider: string,
    rawBody: Buffer | undefined,
    headers: Record<string, string | string[] | undefined>,
  ) {
    if (provider !== this.esign.name) throw new NotFoundException();
    if (!rawBody) throw new BadRequestException("Empty webhook.");
    let result;
    try {
      result = this.esign.verifyWebhook(rawBody, headers);
    } catch {
      result = null;
    }
    if (!result) throw new UnauthorizedException("Webhook signature did not verify.");
    const db = this.prisma.client;
    const c = await db.recoveryCase.findUnique({
      where: { esignRequestId: result.requestId },
      include: { client: true },
    });
    if (!c) throw new NotFoundException("Unknown sign request.");
    if (c.esignStatus === "SIGNED") return { ok: true, duplicate: true };
    if (result.status !== "SIGNED") {
      await this.event(
        c.id,
        null,
        "esign",
        "The eSign was not completed. The client can try again.",
      );
      return { ok: true };
    }
    const signedAt = new Date();
    let mandateUrl = c.esignMandateUrl;
    if (mandateUrl?.startsWith("local://") || mandateUrl?.startsWith("s3://")) {
      const signed = await stampSigned(
        await this.storage.get(mandateUrl),
        c.client.name,
        signedAt,
        provider,
        result.requestId,
      );
      mandateUrl = await this.storage.put(
        `cases/${c.id}/mandate/${randomUUID()}-signed.pdf`,
        signed,
        "application/pdf",
      );
    }
    await db.recoveryCase.update({
      where: { id: c.id },
      data: { esignStatus: "SIGNED", esignSignedAt: signedAt, esignMandateUrl: mandateUrl },
    });
    await this.event(c.id, c.clientUserId, "esign", "Mandate signed with Aadhaar eSign.");
    await this.audit.record({
      actorId: c.clientUserId,
      actorRole: "INVESTOR",
      action: "case.esign.signed",
      entityType: "case",
      entityId: c.id,
      data: { provider, requestId: result.requestId },
    });
    return { ok: true };
  }

  async mandatePdf(code: string, user: SessionClaims): Promise<{ body: Buffer; fileName: string }> {
    const c = await this.access(code, user, "read");
    if (c.esignMandateUrl && !c.esignMandateUrl.startsWith("seed://")) {
      return {
        body: await this.storage.get(c.esignMandateUrl),
        fileName: `${c.caseCode}-scope-of-work.pdf`,
      };
    }
    // Not generated yet (or a test fixture): render a preview on the fly.
    const body = await buildMandatePdf({
      caseCode: c.caseCode,
      clientName: c.client.name,
      clientPhone: c.client.phone,
      companyName: c.company.name,
      folioMasked: c.folio?.folioNumberMasked ?? "not linked",
      scenario: c.scenarioType,
      feePct: num(c.agreedSuccessFeePct),
      issuedOn: new Date().toISOString().slice(0, 10),
    });
    return { body, fileName: `${c.caseCode}-scope-of-work-preview.pdf` };
  }

  /* ── Document vault ─────────────────────────────────────────────────── */

  async upload(
    code: string,
    docType: DocType,
    file: UploadedFile | undefined,
    user: SessionClaims,
  ) {
    const c = await this.access(code, user, "client-write");
    if (!file) throw new BadRequestException("Attach a file.");
    if (!ALLOWED_MIME.has(file.mimetype))
      throw new BadRequestException("Upload a PDF, JPG or PNG.");
    if (file.size > this.env.MAX_UPLOAD_MB * 1024 * 1024)
      throw new BadRequestException(`Files can be up to ${this.env.MAX_UPLOAD_MB} MB.`);
    const existing = c.documents.find((d) => d.docType === docType);
    if (existing?.status === "VERIFIED" && !isStaff(user))
      throw new ConflictException("This document is already verified.");
    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    const ext =
      file.mimetype === "application/pdf" ? "pdf" : file.mimetype === "image/png" ? "png" : "jpg";
    const url = await this.storage.put(
      `cases/${c.id}/${docType.toLowerCase()}/${randomUUID()}.${ext}`,
      file.buffer,
      file.mimetype,
    );
    const fileName =
      file.originalname.replace(/[^\w.\- ]+/g, "_").slice(0, 120) ||
      `${docType.toLowerCase()}.${ext}`;
    const data = {
      s3Url: url,
      fileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      sha256,
      status: "UPLOADED" as const,
      reviewerComment: null,
      reviewerId: null,
      reviewedAt: null,
      uploadedAt: new Date(),
    };
    await this.prisma.client.caseDocument.upsert({
      where: { caseId_docType: { caseId: c.id, docType } },
      update: data,
      create: { caseId: c.id, docType, ...data },
    });
    await this.event(c.id, user.sub, "document", `${DOC_TYPE_LABELS[docType]} uploaded.`);
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "case.document.upload",
      entityType: "case",
      entityId: c.id,
      data: { docType, sha256, sizeBytes: file.size },
    });
    return this.get(code, user);
  }

  async review(
    code: string,
    docType: DocType,
    user: SessionClaims,
    status: "VERIFIED" | "REJECTED",
    comment?: string,
  ) {
    const c = await this.access(code, user, "staff-write");
    const doc = c.documents.find((d) => d.docType === docType);
    if (!doc?.s3Url)
      throw new ConflictException("Nothing has been uploaded for this document yet.");
    if (status === "REJECTED" && !comment?.trim())
      throw new BadRequestException("Say what the client needs to fix.");
    await this.prisma.client.caseDocument.update({
      where: { id: doc.id },
      data: {
        status,
        reviewerComment: comment?.trim() || null,
        reviewerId: user.sub,
        reviewedAt: new Date(),
      },
    });
    await this.event(
      c.id,
      user.sub,
      "document",
      `${DOC_TYPE_LABELS[docType]} ${status === "VERIFIED" ? "verified" : "sent back"}.`,
    );
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "case.document.review",
      entityType: "case",
      entityId: c.id,
      data: { docType, status },
    });
    return this.get(code, user);
  }

  async download(code: string, docType: DocType, user: SessionClaims) {
    const c = await this.access(code, user, "client-write");
    const doc = c.documents.find((d) => d.docType === docType);
    if (!doc?.s3Url) throw new NotFoundException("No file for this document.");
    if (doc.s3Url.startsWith("seed://"))
      throw new NotFoundException("This record has no stored file.");
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "case.document.download",
      entityType: "case",
      entityId: c.id,
      data: { docType },
    });
    return {
      body: await this.storage.get(doc.s3Url),
      mimeType: doc.mimeType ?? "application/octet-stream",
      fileName: doc.fileName ?? docType.toLowerCase(),
    };
  }
}
