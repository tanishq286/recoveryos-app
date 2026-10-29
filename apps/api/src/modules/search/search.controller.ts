import { Body, Controller, Get, Headers, HttpCode, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  CUSTODY_STATUSES,
  INDIAN_STATES,
  PHYSICAL_CERT_STATUSES,
  RELATIONSHIPS,
} from "@recoveryos/shared";
import { z } from "zod";

import { clientIp, CurrentUser, Public, type AuthedRequest } from "../../common/auth/decorators.js";
import type { SessionClaims } from "../../common/auth/tokens.service.js";
import { SearchService } from "./search.service.js";

const name = z.string().trim().max(60).optional();

export const searchQuerySchema = z
  .object({
    firstName: name,
    middleName: name,
    lastName: name,
    fullName: z.string().trim().max(120).optional(),
    state: z.enum(INDIAN_STATES, { error: "Choose the state on the holder's last known address." }),
    custodyStatus: z.enum(CUSTODY_STATUSES).optional(),
  })
  .refine((q) => q.firstName || q.middleName || q.lastName || q.fullName, {
    message: "Enter at least one name: first, middle, last or full name.",
  });

export const unlockSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().min(10).max(20),
  otpCode: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  email: z.email().max(200).optional(),
  relationshipToHolder: z.enum(RELATIONSHIPS),
  physicalCertStatus: z.enum(PHYSICAL_CERT_STATUSES),
  folioIds: z.array(z.uuid()).min(1).max(10),
  referralCode: z.string().trim().max(20).optional(),
  consent: z.literal(true, { error: "We need your consent to call you about these holdings." }),
});

@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /**
   * GET /api/v1/search/unclaimed
   * Four ways to search: first + middle + last, first only, middle only or
   * last only, always with a state. Company and folio stay masked unless an
   * `x-unlock-token` covers the row or the caller is staff.
   */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get("unclaimed")
  unclaimed(
    @Query({ schema: searchQuerySchema }) query: z.infer<typeof searchQuerySchema>,
    @Headers("x-unlock-token") unlockToken: string | undefined,
    @CurrentUser() user: SessionClaims | undefined,
  ) {
    return this.search.search(query, { unlockToken, role: user?.role });
  }

  /** POST /api/v1/search/unlock: verify the phone code, record the lead, unmask the chosen rows. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("unlock")
  @HttpCode(200)
  unlock(
    @Body({ schema: unlockSchema }) body: z.infer<typeof unlockSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.search.unlock(body, clientIp(req));
  }
}
