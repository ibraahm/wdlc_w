import { Injectable } from '@nestjs/common';
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
}

const toJson = (v: unknown) => (v !== undefined ? JSON.stringify(v) : undefined);

@Injectable()
export class AuditService {
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
      console.error('Audit log write failed:', err);
    }
  }

  async list(params: { entity?: string; adminId?: string; agentId?: string; take?: number; skip?: number }) {
    const { entity, adminId, agentId, take = 100, skip = 0 } = params;
    const where = {
      ...(entity ? { entity } : {}),
      ...(adminId ? { adminId } : {}),
      ...(agentId ? { agentId } : {}),
    };
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
