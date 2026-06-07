import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettingService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.prisma.siteSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  }

  async get(key: string): Promise<unknown> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    return row ? JSON.parse(row.value) : null;
  }

  async set(key: string, value: unknown, adminId: string) {
    const before = await this.prisma.siteSetting.findUnique({ where: { key } });
    const serialized = JSON.stringify(value);
    await this.prisma.siteSetting.upsert({ where: { key }, update: { value: serialized }, create: { key, value: serialized } });
    await this.audit.log({ action: 'setting.set', adminId, entity: 'SiteSetting', entityId: key, before: before ? JSON.parse(before.value) : null, after: value });
    return { key, value };
  }

  async delete(key: string, adminId: string) {
    await this.prisma.siteSetting.delete({ where: { key } });
    await this.audit.log({ action: 'setting.delete', adminId, entity: 'SiteSetting', entityId: key });
    return { ok: true };
  }
}
