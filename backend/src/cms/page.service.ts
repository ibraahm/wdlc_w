import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto';

const EDITOR = 'EDITOR';
const MANAGER = 'MANAGER';
const PUBLISHED = 'PUBLISHED';
const DRAFT = 'DRAFT';

@Injectable()
export class PageService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private deserialize(page: any) {
    return { ...page, blocks: JSON.parse(page.blocks || '[]') };
  }

  async findAll(status?: string) {
    const rows = await this.prisma.page.findMany({
      where: status ? { status } : undefined,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows;
  }

  async findBySlug(slug: string, publishedOnly = false) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    if (publishedOnly && page.status !== PUBLISHED) {
      throw new NotFoundException(`Page "${slug}" not found`);
    }
    return this.deserialize(page);
  }

  async create(dto: CreatePageDto, actorId: string) {
    const existing = await this.prisma.page.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const page = await this.prisma.page.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        blocks: JSON.stringify(dto.blocks ?? []),
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        authorId: actorId,
      },
    });
    await this.audit.log({
      action: 'page.create',
      actorId,
      entity: 'Page',
      entityId: page.id,
      after: { slug: page.slug, title: page.title },
    });
    return this.deserialize(page);
  }

  async update(slug: string, dto: UpdatePageDto, actorId: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    const before = { title: page.title, status: page.status };

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
    await this.audit.log({
      action: 'page.update',
      actorId,
      entity: 'Page',
      entityId: page.id,
      before,
      after: { title: updated.title },
    });
    return this.deserialize(updated);
  }

  async publish(slug: string, actorId: string, actorRole: string) {
    if (actorRole === EDITOR) {
      throw new ForbiddenException('Editors cannot publish pages');
    }
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: { status: PUBLISHED, publishedAt: new Date() },
    });
    await this.audit.log({ action: 'page.publish', actorId, entity: 'Page', entityId: page.id });
    return this.deserialize(updated);
  }

  async unpublish(slug: string, actorId: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: { status: DRAFT },
    });
    await this.audit.log({ action: 'page.unpublish', actorId, entity: 'Page', entityId: page.id });
    return this.deserialize(updated);
  }

  async remove(slug: string, actorId: string, actorRole: string) {
    if (actorRole === EDITOR || actorRole === MANAGER) {
      throw new ForbiddenException('Insufficient permissions to delete pages');
    }
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Page "${slug}" not found`);
    await this.prisma.page.delete({ where: { id: page.id } });
    await this.audit.log({
      action: 'page.delete',
      actorId,
      entity: 'Page',
      entityId: page.id,
      before: { slug: page.slug, title: page.title },
    });
    return { ok: true };
  }
}
