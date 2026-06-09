import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNewsPostDto {
  @IsString() @MaxLength(300) title: string;
  @IsString() @MaxLength(200) slug: string;
  @IsOptional() @IsEnum(['NEWS', 'PRESS']) category?: string;
  @IsOptional() @IsString() @MaxLength(500) summary?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() @MaxLength(200) author?: string;
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @IsOptional() @IsEnum(['DRAFT', 'PUBLISHED']) status?: string;
  @IsOptional() publishedAt?: string;
}

export class UpdateNewsPostDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(200) slug?: string;
  @IsOptional() @IsEnum(['NEWS', 'PRESS']) category?: string;
  @IsOptional() @IsString() @MaxLength(500) summary?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() @MaxLength(200) author?: string;
  @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @IsOptional() @IsEnum(['DRAFT', 'PUBLISHED']) status?: string;
  @IsOptional() publishedAt?: string | null;
}

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  listPublished(category?: string) {
    return (this.prisma.newsPost as any).findMany({
      where: { status: 'PUBLISHED', ...(category ? { category } : {}) },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, slug: true, category: true, summary: true, author: true, imageUrl: true, publishedAt: true, createdAt: true },
    });
  }

  async getPublished(slug: string) {
    const post = await (this.prisma.newsPost as any).findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (!post) throw new NotFoundException(`Post not found`);
    return post;
  }

  listAll(category?: string) {
    return (this.prisma.newsPost as any).findMany({
      where: category ? { category } : {},
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateNewsPostDto, adminId: string) {
    const existing = await (this.prisma.newsPost as any).findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" already in use`);
    const post = await (this.prisma.newsPost as any).create({
      data: {
        title: dto.title,
        slug: dto.slug,
        category: dto.category ?? 'NEWS',
        summary: dto.summary ?? null,
        body: dto.body ?? '',
        author: dto.author ?? null,
        imageUrl: dto.imageUrl ?? null,
        status: dto.status ?? 'DRAFT',
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
      },
    });
    await this.audit.log({ action: 'news.create', adminId, entity: 'NewsPost', entityId: post.id, after: { title: dto.title } });
    return post;
  }

  async update(id: string, dto: UpdateNewsPostDto, adminId: string) {
    const existing = await (this.prisma.newsPost as any).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Post ${id} not found`);
    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await (this.prisma.newsPost as any).findUnique({ where: { slug: dto.slug } });
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" already in use`);
    }
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.summary !== undefined) data.summary = dto.summary;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.author !== undefined) data.author = dto.author;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.status !== undefined) data.status = dto.status;
    if ('publishedAt' in dto) data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt as string) : null;
    const updated = await (this.prisma.newsPost as any).update({ where: { id }, data });
    await this.audit.log({ action: 'news.update', adminId, entity: 'NewsPost', entityId: id, after: dto });
    return updated;
  }

  async remove(id: string, adminId: string) {
    const existing = await (this.prisma.newsPost as any).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Post ${id} not found`);
    await (this.prisma.newsPost as any).delete({ where: { id } });
    await this.audit.log({ action: 'news.delete', adminId, entity: 'NewsPost', entityId: id });
    return { ok: true };
  }
}
