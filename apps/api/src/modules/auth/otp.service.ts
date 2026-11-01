import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { BRAND_EMAILS, normalizeIndianMobile } from "@finsol/shared";

import { ENV, type Env } from "../../config/env.js";
import { PrismaService } from "../../common/prisma.service.js";
import { OTP_SENDER, type OtpSender } from "../../common/providers/otp.provider.js";

/** LOGIN signs in; UNLOCK confirms the Digital Mandate when no eSign provider is configured. */
export type OtpPurpose = "LOGIN" | "UNLOCK";

const TTL_MS = 5 * 60_000;
const RESEND_AFTER_MS = 30_000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

/** The development seed's administrator number. It must never sign in to production. */
export const DEV_DEFAULT_ADMIN_PHONE = "+919000000001";

export const OTP_PAUSED_MESSAGE = `Sign-in by mobile code is paused while our SMS provider is being connected. Search, company pages and the calculator still work. For help with a claim, email ${BRAND_EMAILS.support}.`;

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

  private readonly log = new Logger("OTP");

  /** Whether codes can be delivered at all, for the sign-in screen. Never reveals a code. */
  status() {
    return {
      available: this.sender.available,
      channel: this.sender.available ? "sms" : null,
      message: this.sender.available ? null : OTP_PAUSED_MESSAGE,
    };
  }

  private assertAllowed(phone: string) {
    if (!this.sender.available) throw new ServiceUnavailableException(OTP_PAUSED_MESSAGE);
    if (this.env.NODE_ENV === "production" && phone === DEV_DEFAULT_ADMIN_PHONE)
      throw new BadRequestException("This number cannot be used to sign in.");
  }

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
    this.assertAllowed(phone);
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
    const challenge = await db.otpChallenge.create({
      data: { phone, purpose, codeHash: this.hash(phone, purpose, code), expiresAt, requestIp: ip },
    });
    try {
      await this.sender.send(phone, code);
    } catch (err) {
      // An undelivered code must not stay usable; the failure is logged without it.
      await db.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      this.log.error(`OTP delivery failed via ${this.sender.name}: ${(err as Error).message}`);
      throw new BadGatewayException(
        "We could not send the code just now. Please try again in a few minutes.",
      );
    }
    // The code is never part of the response, in any environment.
    return {
      phone,
      expiresAt: expiresAt.toISOString(),
      resendAfterSeconds: RESEND_AFTER_MS / 1000,
      channel: "sms" as const,
    };
  }

  /** Consumes the code. Throws one generic error for every failure, so nothing leaks. */
  async verify(rawPhone: string, purpose: OtpPurpose, code: string): Promise<string> {
    const phone = this.phoneOrThrow(rawPhone);
    this.assertAllowed(phone);
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
