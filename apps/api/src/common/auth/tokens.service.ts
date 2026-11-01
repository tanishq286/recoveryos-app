import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "@finsol/shared";

import { ENV, type Env } from "../../config/env.js";

export interface SessionClaims {
  typ: "session";
  sub: string;
  role: Role;
  name: string;
}

/** Signed sessions, issued after the Login Gateway's mobile OTP. */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  signSession(user: { id: string; role: Role; name: string }): {
    token: string;
    expiresAt: string;
  } {
    const expiresIn = this.env.SESSION_TTL_HOURS * 3600;
    const token = this.jwt.sign(
      { typ: "session", sub: user.id, role: user.role, name: user.name } satisfies SessionClaims,
      {
        secret: this.env.JWT_SECRET,
        expiresIn,
        issuer: "finsol",
        audience: "finsol-session",
      },
    );
    return { token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  verifySession(token: string): SessionClaims | null {
    try {
      const c = this.jwt.verify<SessionClaims>(token, {
        secret: this.env.JWT_SECRET,
        issuer: ["finsol", "recoveryos"],
        audience: ["finsol-session", "recoveryos-session"],
      });
      return c.typ === "session" ? c : null;
    } catch {
      return null;
    }
  }
}
