import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateNavItemDto, UpdateNavItemDto } from './dto/nav.dto';

@Injectable()
export class NavService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async tree(location?: string) {
    return this.prisma.navItem.findMany({
      where: { parentId: null, visible: true, ...(location ? { location } : {}) },
      include: { children: { where: { visible: true }, orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
  }

  /** Admin view: every item including hidden ones, for the navigation manager. */
  async treeAll(location?: string) {
    return this.prisma.navItem.findMany({
      where: { parentId: null, ...(location ? { location } : {}) },
      include: { children: { orderBy: { order: 'asc' } } },
      orderBy: [{ location: 'asc' }, { order: 'asc' }],
    });
  }

  async create(dto: CreateNavItemDto, adminId: string) {
    const item = await this.prisma.navItem.create({
      data: { label: dto.label, href: dto.href, location: dto.location ?? 'HEADER', column: dto.column, order: dto.order ?? 0, parentId: dto.parentId, visible: dto.visible ?? true },
    });
    await this.audit.log({ action: 'nav.create', adminId, entity: 'NavItem', entityId: item.id, after: dto });
    return item;
  }

  async update(id: string, dto: UpdateNavItemDto, adminId: string) {
    const existing = await this.prisma.navItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Nav item ${id} not found`);
    const updated = await this.prisma.navItem.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.href !== undefined ? { href: dto.href } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.column !== undefined ? { column: dto.column } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.visible !== undefined ? { visible: dto.visible } : {}),
      },
    });
    await this.audit.log({ action: 'nav.update', adminId, entity: 'NavItem', entityId: id, before: existing, after: dto });
    return updated;
  }

  async remove(id: string, adminId: string) {
    const existing = await this.prisma.navItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Nav item ${id} not found`);
    await this.prisma.navItem.delete({ where: { id } });
    await this.audit.log({ action: 'nav.delete', adminId, entity: 'NavItem', entityId: id, before: existing });
    return { ok: true };
  }

  async reorder(items: { id: string; order: number }[], adminId: string) {
    await this.prisma.$transaction(items.map(({ id, order }) => this.prisma.navItem.update({ where: { id }, data: { order } })));
    await this.audit.log({ action: 'nav.reorder', adminId, after: items });
    return { ok: true };
  }
}
