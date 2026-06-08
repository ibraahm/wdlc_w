import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';

@Injectable()
export class PartnerService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  listPublic() {
    return this.prisma.partner.findMany({
      where: { active: true },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { name: 'asc' }],
    });
  }

  listAll() {
    return this.prisma.partner.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreatePartnerDto, adminId: string) {
    const partner = await this.prisma.partner.create({
      data: {
        name: dto.name,
        type: dto.type ?? 'CORRESPONDENT',
        description: dto.description ?? null,
        website: dto.website ?? null,
        logoUrl: dto.logoUrl ?? null,
        region: dto.region ?? null,
        featured: dto.featured ?? false,
        active: dto.active ?? true,
        order: dto.order ?? 0,
      },
    });
    await this.audit.log({ action: 'partner.create', adminId, entity: 'Partner', entityId: partner.id, after: { name: dto.name } });
    return partner;
  }

  async update(id: string, dto: UpdatePartnerDto, adminId: string) {
    const existing = await this.prisma.partner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Partner ${id} not found`);
    const updated = await this.prisma.partner.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
    await this.audit.log({ action: 'partner.update', adminId, entity: 'Partner', entityId: id, after: dto });
    return updated;
  }

  async remove(id: string, adminId: string) {
    const existing = await this.prisma.partner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Partner ${id} not found`);
    await this.prisma.partner.delete({ where: { id } });
    await this.audit.log({ action: 'partner.delete', adminId, entity: 'Partner', entityId: id, before: { name: existing.name } });
    return { ok: true };
  }
}
