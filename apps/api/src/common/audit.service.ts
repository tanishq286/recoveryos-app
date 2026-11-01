import { Injectable, Logger } from "@nestjs/common";
import type { Role } from "@finsol/shared";

import { PrismaService } from "./prisma.service.js";

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  data?: Record<string, unknown>;
  ip?: string | null;
}

/** Writes to the append-only audit_events table. Never throws into the caller. */
@Injectable()
export class AuditService {
  private readonly log = new Logger("Audit");

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.client.auditEvent.create({
        data: {
          actorId: entry.actorId ?? null,
          actorRole: entry.actorRole ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          data: (entry.data ?? undefined) as never,
          ip: entry.ip ?? null,
        },
      });
    } catch (e) {
      this.log.error(`Could not write audit event ${entry.action}: ${(e as Error).message}`);
    }
  }
}
