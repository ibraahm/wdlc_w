import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;
  actorId?: string;
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
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId,
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

  async list(params: { entity?: string; actorId?: string; take?: number; skip?: number }) {
    const { entity, actorId, take = 100, skip = 0 } = params;
    const where = {
      ...(entity ? { entity } : {}),
      ...(actorId ? { actorId } : {}),
    };
    const [raw, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        include: { actor: { select: { email: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    // Deserialize JSON strings back to objects for the API response
    const items = raw.map((r) => ({
      ...r,
      before: r.before ? JSON.parse(r.before) : null,
      after: r.after ? JSON.parse(r.after) : null,
    }));
    return { items, total };
  }
}
