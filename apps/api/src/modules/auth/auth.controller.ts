import { Body, Controller, Get, HttpCode, NotFoundException, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";

import { PrismaService } from "../../common/prisma.service.js";
import { AuditService } from "../../common/audit.service.js";
import { clientIp, CurrentUser, Public, type AuthedRequest } from "../../common/auth/decorators.js";
import { TokensService, type SessionClaims } from "../../common/auth/tokens.service.js";
import { OtpService } from "./otp.service.js";

const requestSchema = z.object({
  phone: z.string().min(10).max(20),
  purpose: z.enum(["UNLOCK", "LOGIN"]),
});

const verifySchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  name: z.string().trim().min(2).max(120).optional(),
});

@Controller("auth")
export class AuthController {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Sends a code for signing in or for unlocking search results. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("otp/request")
  @HttpCode(200)
  request(
    @Body({ schema: requestSchema }) body: z.infer<typeof requestSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.otp.request(body.phone, body.purpose, clientIp(req));
  }

  /** Signs in with a LOGIN code. A first sign-in creates an investor account. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("otp/verify")
  @HttpCode(200)
  async verify(
    @Body({ schema: verifySchema }) body: z.infer<typeof verifySchema>,
    @Req() req: AuthedRequest,
  ) {
    const phone = await this.otp.verify(body.phone, "LOGIN", body.code);
    const db = this.prisma.client;
    const user = await db.user.upsert({
      where: { phone },
      update: { lastLoginAt: new Date() },
      create: {
        phone,
        name: body.name ?? "New investor",
        role: "INVESTOR",
        lastLoginAt: new Date(),
      },
    });
    if (!user.isActive) throw new NotFoundException("This account is closed.");
    await this.audit.record({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      ip: clientIp(req),
    });
    const session = this.tokens.signSession(user);
    return {
      ...session,
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone },
    };
  }

  @Get("me")
  async me(@CurrentUser() claims: SessionClaims) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: claims.sub },
      include: { associate: { select: { id: true, referralCode: true, isVerified: true } } },
    });
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      email: user.email,
      associate: user.associate,
    };
  }
}
