import { randomInt } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  normalizeIndianMobile,
  PROFESSION_LABELS,
  folioStateLabel,
  type IndianState,
  type PhysicalCertStatus,
  type Profession,
  type Relationship,
} from "@finsol/shared";

import { AuditService } from "../../common/audit.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { TokensService } from "../../common/auth/tokens.service.js";
import { isoTime, num } from "../../common/serialize.js";

@Injectable()
export class AssociatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tokens: TokensService,
  ) {}

  private async referralCode(name: string, city: string): Promise<string> {
    const base =
      `${name.replace(/[^A-Za-z]/g, "").slice(0, 5)}-${city.replace(/[^A-Za-z]/g, "").slice(0, 3)}`.toUpperCase();
    for (let i = 0; i < 5; i++) {
      const code = i === 0 ? base : `${base}${randomInt(10, 99)}`;
      if (!(await this.prisma.client.associate.findUnique({ where: { referralCode: code } })))
        return code;
    }
    return `RO-${randomInt(100000, 999999)}`;
  }

  /** Signs the current user up as a partner. They appear on the locator once verified. */
  async register(
    user: SessionClaims,
    body: {
      firmName: string;
      profession: Profession;
      state: IndianState;
      city: string;
      bio?: string;
      name?: string;
    },
  ) {
    const db = this.prisma.client;
    const existing = await db.associate.findUnique({ where: { userId: user.sub } });
    if (existing) throw new ConflictException("You are already registered as a partner.");
    if (user.role !== "INVESTOR" && user.role !== "ASSOCIATE_PARTNER")
      throw new ForbiddenException("Staff accounts cannot be partners.");
    const u = await db.user.update({
      where: { id: user.sub },
      data: { role: "ASSOCIATE_PARTNER", ...(body.name ? { name: body.name } : {}) },
    });
    const associate = await db.associate.create({
      data: {
        userId: user.sub,
        firmName: body.firmName,
        profession: body.profession,
        state: body.state,
        city: body.city,
        bio: body.bio ?? null,
        referralCode: await this.referralCode(u.name, body.city),
      },
    });
    await this.audit.record({
      actorId: user.sub,
      actorRole: "ASSOCIATE_PARTNER",
      action: "associate.register",
      entityType: "associate",
      entityId: associate.id,
    });
    // The role changed, so hand back a fresh session carrying it.
    return {
      associate: {
        id: associate.id,
        referralCode: associate.referralCode,
        isVerified: associate.isVerified,
      },
      session: this.tokens.signSession(u),
    };
  }

  /** Public locator: verified partners only, never their phone numbers. */
  async locator(state?: IndianState, city?: string) {
    const rows = await this.prisma.client.associate.findMany({
      where: {
        isVerified: true,
        ...(state ? { state } : {}),
        ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ state: "asc" }, { city: "asc" }, { firmName: "asc" }],
    });
    return rows.map((a) => ({
      id: a.id,
      name: a.user.name,
      firmName: a.firmName,
      profession: a.profession,
      professionLabel: PROFESSION_LABELS[a.profession],
      state: a.state,
      stateLabel: folioStateLabel(a.state),
      city: a.city,
      bio: a.bio,
      referralCode: a.referralCode,
    }));
  }

  async resolveReferral(code: string) {
    const a = await this.prisma.client.associate.findUnique({
      where: { referralCode: code.toUpperCase() },
      include: { user: { select: { name: true } } },
    });
    if (!a) throw new NotFoundException("That referral code is not recognised.");
    return {
      referralCode: a.referralCode,
      name: a.user.name,
      firmName: a.firmName,
      isVerified: a.isVerified,
    };
  }

  private async mine(user: SessionClaims) {
    const a = await this.prisma.client.associate.findUnique({
      where: { userId: user.sub },
      include: { user: true },
    });
    if (!a) throw new NotFoundException("Register as a partner first.");
    return a;
  }

  async dashboard(user: SessionClaims) {
    const a = await this.mine(user);
    const db = this.prisma.client;
    const [leads, cases, ledger] = await Promise.all([
      db.leadInquiry.findMany({
        where: { associateId: a.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.recoveryCase.findMany({
        where: { associateId: a.id },
        include: { company: { select: { name: true } }, client: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      db.commissionLedgerEntry.findMany({
        where: { associateId: a.id },
        orderBy: { occurredAt: "asc" },
      }),
    ]);
    let balance = 0;
    const entries = ledger.map((e) => {
      balance += Number(e.amountPaise);
      return {
        id: e.id,
        entryType: e.entryType,
        amountPaise: Number(e.amountPaise),
        description: e.description,
        occurredAt: isoTime(e.occurredAt),
        balancePaise: balance,
      };
    });
    const accrued = ledger
      .filter((e) => e.entryType === "ACCRUAL")
      .reduce((s, e) => s + Number(e.amountPaise), 0);
    const paid = -ledger
      .filter((e) => e.entryType === "PAYOUT")
      .reduce((s, e) => s + Number(e.amountPaise), 0);
    const months = new Map<string, { accruedPaise: number; paidPaise: number }>();
    for (const e of ledger) {
      const key = e.occurredAt.toISOString().slice(0, 7);
      const m = months.get(key) ?? { accruedPaise: 0, paidPaise: 0 };
      if (e.entryType === "PAYOUT") m.paidPaise += -Number(e.amountPaise);
      else m.accruedPaise += Number(e.amountPaise);
      months.set(key, m);
    }
    return {
      profile: {
        name: a.user.name,
        firmName: a.firmName,
        profession: a.profession,
        professionLabel: PROFESSION_LABELS[a.profession],
        state: a.state,
        city: a.city,
        referralCode: a.referralCode,
        revenueSharePct: num(a.revenueSharePct),
        isVerified: a.isVerified,
        totalReferredCases: a.totalReferredCases,
      },
      totals: { accruedPaise: accrued, paidPaise: paid, balancePaise: accrued - paid },
      monthly: [...months.entries()].map(([month, v]) => ({ month, ...v })),
      ledger: entries.reverse(),
      leads: leads.map((l) => ({
        id: l.id,
        claimantName: l.claimantName,
        crmStage: l.crmStage,
        phoneVerified: l.phoneOtpVerified,
        createdAt: isoTime(l.createdAt),
        estimatedValuePaise: Number(l.estimatedValuePaise),
      })),
      cases: cases.map((c) => ({
        caseCode: c.caseCode,
        clientName: c.client.name,
        companyName: c.company.name,
        recoverStep: c.recoverStep,
        dematCreditStatus: c.dematCreditStatus,
      })),
    };
  }

  /** A partner submits a client they met. The analyst still verifies the client's phone on the first call. */
  async submitLead(
    user: SessionClaims,
    body: {
      claimantName: string;
      phone: string;
      email?: string;
      relationshipToHolder: Relationship;
      physicalCertStatus: PhysicalCertStatus;
      holderName: string;
      companyName?: string;
      state: IndianState;
      notes?: string;
      consentConfirmed: true;
    },
  ) {
    const a = await this.mine(user);
    const phone = normalizeIndianMobile(body.phone);
    if (!phone) throw new BadRequestException("Enter the client's 10-digit Indian mobile number.");
    const lead = await this.prisma.client.leadInquiry.create({
      data: {
        claimantName: body.claimantName,
        phone,
        email: body.email ?? null,
        phoneOtpVerified: false,
        relationshipToHolder: body.relationshipToHolder,
        physicalCertStatus: body.physicalCertStatus,
        associateId: a.id,
        searchContext: {
          holderName: body.holderName,
          companyName: body.companyName ?? null,
          state: body.state,
          submittedBy: "associate",
        },
        notes: [
          `Submitted by ${a.firmName} (${a.referralCode}).`,
          body.companyName ? `Company: ${body.companyName}.` : null,
          body.notes ?? null,
        ]
          .filter(Boolean)
          .join(" "),
      },
    });
    await this.audit.record({
      actorId: user.sub,
      actorRole: user.role,
      action: "associate.lead.submit",
      entityType: "lead",
      entityId: lead.id,
    });
    return { id: lead.id, crmStage: lead.crmStage };
  }
}
