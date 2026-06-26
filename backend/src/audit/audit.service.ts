import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;
  adminId?: string;
  agentId?: string;
  actorType?: 'admin' | 'agent';
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  // When true, a failed audit write is re-thrown so the calling operation fails
  // closed instead of proceeding without a trail. Default: alert-and-continue.
  critical?: boolean;
}

const toJson = (v: unknown) => (v !== undefined ? JSON.stringify(v) : undefined);

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      const actorType = entry.actorType ?? (entry.adminId ? 'admin' : entry.agentId ? 'agent' : undefined);
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          adminId: entry.adminId,
          agentId: entry.agentId,
          actorType,
          entity: entry.entity,
          entityId: entry.entityId,
          before: toJson(entry.before),
          after: toJson(entry.after),
          ip: entry.ip,
          userAgent: entry.userAgent,
        },
      });
    } catch (err) {
      // Never fail silently: emit a structured, alertable error with full
      // context (the action/actor/entity, never the before/after payloads which
      // may contain sensitive data).
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `AUDIT WRITE FAILED action=${entry.action} actor=${entry.adminId ?? entry.agentId ?? 'system'} ` +
          `entity=${entry.entity ?? '-'}:${entry.entityId ?? '-'} critical=${!!entry.critical} reason=${message}`,
      );
      // Fail closed for critical actions so the operation surfaces the failure.
      if (entry.critical) throw err;
    }
  }

  async list(params: {
    entity?: string;
    adminId?: string;
    agentId?: string;
    action?: string;
    actorType?: string;
    from?: string;
    to?: string;
    take?: number;
    skip?: number;
  }) {
    const { entity, adminId, agentId, action, actorType, from, to, take = 100, skip = 0 } = params;
    const where: Record<string, unknown> = {
      ...(entity ? { entity } : {}),
      ...(adminId ? { adminId } : {}),
      ...(agentId ? { agentId } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
      ...(actorType ? { actorType } : {}),
    };
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    const [raw, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        include: {
          admin: { select: { email: true, name: true } },
          agent: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const items = raw.map((r) => ({
      ...r,
      before: r.before ? JSON.parse(r.before) : null,
      after: r.after ? JSON.parse(r.after) : null,
    }));
    return { items, total };
  }
}
