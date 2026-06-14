import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const CSV = (v?: string | null): string[] =>
  (v ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

@Injectable()
export class RegionalService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // Resolve the active office covering a given state (first match wins).
  async officeForState(state?: string | null): Promise<{ id: string; code: string; name: string } | null> {
    const st = (state ?? '').trim().toUpperCase();
    if (!st) return null;
    const offices = await this.prisma.regionalOffice.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, states: true },
    });
    return offices.find((o) => CSV(o.states).includes(st)) ?? null;
  }

  async list() {
    const offices = await this.prisma.regionalOffice.findMany({ orderBy: [{ active: 'desc' }, { code: 'asc' }] });
    // Attach a managed-agent count per office for the admin list.
    const counts = await this.prisma.agentDDFile.groupBy({
      by: ['regionalOfficeId'],
      _count: { _all: true },
      where: { regionalOfficeId: { not: null } },
    });
    const byId = new Map(counts.map((c) => [c.regionalOfficeId, c._count._all]));
    return offices.map((o) => ({ ...o, agentCount: byId.get(o.id) ?? 0 }));
  }

  private normStates(states?: string | null): string | null {
    const arr = CSV(states);
    return arr.length ? arr.join(',') : null;
  }

  async create(dto: any, adminId: string) {
    const code = (dto.code ?? '').trim().toUpperCase();
    if (!code) throw new BadRequestException('A code is required');
    if (!dto.name?.trim()) throw new BadRequestException('A name is required');
    const clash = await this.prisma.regionalOffice.findUnique({ where: { code } });
    if (clash) throw new BadRequestException(`Code ${code} is already in use`);
    const office = await this.prisma.regionalOffice.create({
      data: {
        code,
        name: dto.name.trim(),
        states: this.normStates(dto.states),
        contactEmail: dto.contactEmail || null,
        contactPhone: dto.contactPhone || null,
        active: dto.active ?? true,
      },
    });
    await this.audit.log({ action: 'regional.office.create', adminId, entity: 'RegionalOffice', entityId: office.id, after: { code, name: office.name } });
    return office;
  }

  async update(id: string, dto: any, adminId: string) {
    const existing = await this.prisma.regionalOffice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Regional office not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.states !== undefined) data.states = this.normStates(dto.states);
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail || null;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone || null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      const clash = await this.prisma.regionalOffice.findUnique({ where: { code } });
      if (clash && clash.id !== id) throw new BadRequestException(`Code ${code} is already in use`);
      data.code = code;
    }
    const office = await this.prisma.regionalOffice.update({ where: { id }, data });
    await this.audit.log({ action: 'regional.office.update', adminId, entity: 'RegionalOffice', entityId: id, after: data });
    return office;
  }

  async remove(id: string, adminId: string) {
    const existing = await this.prisma.regionalOffice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Regional office not found');
    // Detach any DD files / users pointing at this office so nothing is orphaned.
    await this.prisma.agentDDFile.updateMany({ where: { regionalOfficeId: id }, data: { regionalOfficeId: null } });
    await this.prisma.adminUser.updateMany({ where: { regionalOfficeId: id }, data: { regionalOfficeId: null } });
    await this.prisma.regionalOffice.delete({ where: { id } });
    await this.audit.log({ action: 'regional.office.delete', adminId, entity: 'RegionalOffice', entityId: id, before: { code: existing.code } });
    return { deleted: true };
  }
}
