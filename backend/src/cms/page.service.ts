import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto';

@Injectable()
export class PageService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private deserialize(page: any) {
    return { ...page, blocks: JSON.parse(page.blocks || '[]') };
  }

  async findAll(status?: string) {
    return this.prisma.page.findMany({
      where: status ? { status } : undefined,
      select: { id: true, slug: true, title: true, description: true, status: true, publishedAt: true, updatedAt: true, author: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findBySlug(slug: string, publishedOnly = false) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    if (publishedOnly && page.status !== 'PUBLISHED') throw new NotFoundException(`Page "${slug}" not found`);
    return this.deserialize(page);
  }

  async create(dto: CreatePageDto, adminId: string) {
    const existing = await this.prisma.page.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    const page = await this.prisma.page.create({
      data: { slug: dto.slug, title: dto.title, description: dto.description, blocks: JSON.stringify(dto.blocks ?? []), seoTitle: dto.seoTitle, seoDescription: dto.seoDescription, authorId: adminId },
    });
    await this.audit.log({ action: 'page.create', adminId, entity: 'Page', entityId: page.id, after: { slug: page.slug, title: page.title } });
    return this.deserialize(page);
  }

  async update(slug: string, dto: UpdatePageDto, adminId: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.blocks !== undefined ? { blocks: JSON.stringify(dto.blocks) } : {}),
        ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
        ...(dto.seoDescription !== undefined ? { seoDescription: dto.seoDescription } : {}),
      },
    });
    await this.audit.log({ action: 'page.update', adminId, entity: 'Page', entityId: page.id, before: { title: page.title }, after: { title: updated.title } });
    return this.deserialize(updated);
  }

  async publish(slug: string, adminId: string, role: string) {
    if (role === 'EDITOR') throw new ForbiddenException('Editors cannot publish pages');
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    const updated = await this.prisma.page.update({ where: { id: page.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await this.audit.log({ action: 'page.publish', adminId, entity: 'Page', entityId: page.id });
    return this.deserialize(updated);
  }

  async unpublish(slug: string, adminId: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    const updated = await this.prisma.page.update({ where: { id: page.id }, data: { status: 'DRAFT' } });
    await this.audit.log({ action: 'page.unpublish', adminId, entity: 'Page', entityId: page.id });
    return this.deserialize(updated);
  }

  async remove(slug: string, adminId: string, role: string) {
    if (role === 'EDITOR' || role === 'MANAGER') throw new ForbiddenException('Insufficient permissions to delete pages');
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    await this.prisma.page.delete({ where: { id: page.id } });
    await this.audit.log({ action: 'page.delete', adminId, entity: 'Page', entityId: page.id, before: { slug: page.slug } });
    return { ok: true };
  }
}
