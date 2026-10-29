import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "@recoveryos/shared";

import { ENV, type Env } from "../../config/env.js";

export interface SessionClaims {
  typ: "session";
  sub: string;
  role: Role;
  name: string;
}

export interface UnlockClaims {
  typ: "unlock";
  /** The lead the unlock created or updated. */
  lid: string;
  /** Folio ids this token may see unmasked. */
  fids: string[];
}

/**
 * Two token kinds with separate secrets, so an unlock token can never be
 * replayed as a session and the other way round.
 */
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
        issuer: "recoveryos",
        audience: "recoveryos-session",
      },
    );
    return { token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  verifySession(token: string): SessionClaims | null {
    try {
      const c = this.jwt.verify<SessionClaims>(token, {
        secret: this.env.JWT_SECRET,
        issuer: "recoveryos",
        audience: "recoveryos-session",
      });
      return c.typ === "session" ? c : null;
    } catch {
      return null;
    }
  }

  signUnlock(leadId: string, folioIds: string[]): { token: string; expiresAt: string } {
    const expiresIn = this.env.UNLOCK_TTL_HOURS * 3600;
    const token = this.jwt.sign(
      { typ: "unlock", lid: leadId, fids: folioIds } satisfies UnlockClaims,
      {
        secret: this.env.UNLOCK_JWT_SECRET,
        expiresIn,
        issuer: "recoveryos",
        audience: "recoveryos-unlock",
      },
    );
    return { token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  verifyUnlock(token: string): UnlockClaims | null {
    try {
      const c = this.jwt.verify<UnlockClaims>(token, {
        secret: this.env.UNLOCK_JWT_SECRET,
        issuer: "recoveryos",
        audience: "recoveryos-unlock",
      });
      return c.typ === "unlock" && Array.isArray(c.fids) ? c : null;
    } catch {
      return null;
    }
  }
}
