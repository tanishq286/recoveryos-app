import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { normalizeIndianMobile, STAFF_ROLES } from "@recoveryos/shared";

import { ENV, type Env } from "../../config/env.js";
import { PrismaService } from "../../common/prisma.service.js";
import { OTP_SENDER, type OtpSender } from "../../common/providers/otp.provider.js";

/** LOGIN signs in; UNLOCK confirms the Digital Mandate when no eSign provider is configured. */
export type OtpPurpose = "LOGIN" | "UNLOCK";

const TTL_MS = 5 * 60_000;
const RESEND_AFTER_MS = 30_000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

/**
 * One-time codes typed into this site by the person who asked for them.
 * Codes are 6 digits, live 5 minutes, allow 5 tries, and are stored only as
 * an HMAC. Sending is rate-limited per phone (one every 30 s, five an hour).
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OTP_SENDER) private readonly sender: OtpSender,
    @Inject(ENV) private readonly env: Env,
  ) {}

  phoneOrThrow(raw: string): string {
    const phone = normalizeIndianMobile(raw);
    if (!phone) throw new BadRequestException("Enter a 10-digit Indian mobile number.");
    return phone;
  }

  private hash(phone: string, purpose: OtpPurpose, code: string): string {
    return createHmac("sha256", this.env.OTP_SECRET)
      .update(`${phone}:${purpose}:${code}`)
      .digest("hex");
  }

  async request(rawPhone: string, purpose: OtpPurpose, ip: string | null) {
    const phone = this.phoneOrThrow(rawPhone);
    const db = this.prisma.client;
    const recent = await db.otpChallenge.findMany({
      where: { phone, purpose, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const latest = recent[0];
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_AFTER_MS) {
      const wait = Math.ceil((RESEND_AFTER_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
      throw new HttpException(
        `Please wait ${wait} seconds before asking for another code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recent.length >= MAX_PER_HOUR) {
      throw new HttpException(
        "Too many codes for this number. Try again in an hour.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + TTL_MS);
    await db.otpChallenge.create({
      data: { phone, purpose, codeHash: this.hash(phone, purpose, code), expiresAt, requestIp: ip },
    });
    await this.sender.send(phone, code);
    // Without an SMS provider the code is shown on screen, but never for a staff
    // account: anyone could otherwise sign in as staff by typing their number.
    let testCode: string | undefined;
    if (this.sender.revealsCode) {
      const account = await db.user.findUnique({ where: { phone }, select: { role: true } });
      const staff = account && (STAFF_ROLES as readonly string[]).includes(account.role);
      if (!staff) testCode = code;
    }
    return {
      phone,
      expiresAt: expiresAt.toISOString(),
      resendAfterSeconds: RESEND_AFTER_MS / 1000,
      channel: this.sender.name,
      ...(testCode ? { testCode } : {}),
    };
  }

  /** Consumes the code. Throws one generic error for every failure, so nothing leaks. */
  async verify(rawPhone: string, purpose: OtpPurpose, code: string): Promise<string> {
    const phone = this.phoneOrThrow(rawPhone);
    const invalid = new BadRequestException(
      "That code is wrong or has expired. Ask for a new one.",
    );
    if (!/^\d{6}$/.test(code)) throw invalid;
    const db = this.prisma.client;
    const challenge = await db.otpChallenge.findFirst({
      where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge || challenge.attempts >= MAX_ATTEMPTS) throw invalid;
    await db.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    const expected = Buffer.from(challenge.codeHash, "hex");
    const given = Buffer.from(this.hash(phone, purpose, code), "hex");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw invalid;
    // Conditional update: two concurrent verifications cannot both consume it.
    const consumed = await db.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw invalid;
    return phone;
  }
}
