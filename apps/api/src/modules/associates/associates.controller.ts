import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  INDIAN_STATES,
  PHYSICAL_CERT_STATUSES,
  PROFESSIONS,
  RELATIONSHIPS,
} from "@finsol/shared";
import { z } from "zod";

import { CurrentUser, Public, Roles } from "../../common/auth/decorators.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { AssociatesService } from "./associates.service.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  firmName: z.string().trim().min(2).max(160),
  profession: z.enum(PROFESSIONS),
  state: z.enum(INDIAN_STATES),
  city: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).optional(),
});
const locatorSchema = z.object({
  state: z.enum(INDIAN_STATES).optional(),
  city: z.string().trim().max(80).optional(),
});
const leadSchema = z.object({
  claimantName: z.string().trim().min(2).max(120),
  phone: z.string().min(10).max(20),
  email: z.email().optional(),
  relationshipToHolder: z.enum(RELATIONSHIPS),
  physicalCertStatus: z.enum(PHYSICAL_CERT_STATUSES),
  holderName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(160).optional(),
  state: z.enum(INDIAN_STATES),
  notes: z.string().trim().max(1000).optional(),
  consentConfirmed: z.literal(true, { error: "Confirm the client agreed to be contacted." }),
});

@Controller("associates")
export class AssociatesController {
  constructor(private readonly associates: AssociatesService) {}

  @Post("register")
  register(
    @Body({ schema: registerSchema }) body: z.infer<typeof registerSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.associates.register(user, body);
  }

  @Public()
  @Get("locator")
  locator(@Query({ schema: locatorSchema }) q: z.infer<typeof locatorSchema>) {
    return this.associates.locator(q.state, q.city);
  }

  @Public()
  @Get("referral/:code")
  referral(@Param("code", { schema: z.string().regex(/^[A-Za-z0-9-]{3,20}$/) }) code: string) {
    return this.associates.resolveReferral(code);
  }

  @Roles("ASSOCIATE_PARTNER")
  @Get("me")
  me(@CurrentUser() user: SessionClaims) {
    return this.associates.dashboard(user);
  }

  @Roles("ASSOCIATE_PARTNER")
  @Post("me/leads")
  submitLead(
    @Body({ schema: leadSchema }) body: z.infer<typeof leadSchema>,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.associates.submitLead(user, body);
  }
}
