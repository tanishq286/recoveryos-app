import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@finsol/shared";

import { IS_PUBLIC, ROLES, type AuthedRequest } from "./decorators.js";
import { TokensService } from "./tokens.service.js";

/**
 * Global guard: every route needs a session unless marked @Public(), and
 * @Roles() narrows it further. SUPER_ADMIN passes every role check.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const claims = bearer ? this.tokens.verifySession(bearer) : null;
    if (claims) req.user = claims;

    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (!claims) throw new UnauthorizedException("Sign in to continue.");

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, targets);
    if (roles?.length && claims.role !== "SUPER_ADMIN" && !roles.includes(claims.role)) {
      throw new ForbiddenException("Your role cannot do this.");
    }
    return true;
  }
}
