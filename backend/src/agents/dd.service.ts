import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DD_CATALOG } from './dd-catalog';
import { computeDocStatus } from './dd-status.util';
import {
  CreateDDFileDto,
  UpdateDocumentDto,
  SetStageDto,
  SetRiskDto,
  RecordReviewDto,
} from './dto/dd.dto';

/**
 * Owns the agent due-diligence lifecycle: creating a DD file (optionally from an
 * approved application), seeding the 19-item catalog, tracking each document's
 * presence/expiry/status/Dropbox pointer, risk rating, lifecycle stage, and the
 * periodic-review cycle. Every mutation is written to the audit log.
 */
@Injectable()
export class DDService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Creation ────────────────────────────────────────────────────────────────
  /** Creates a DD file and seeds the catalog. Business-only docs become NA for individuals. */
  async createFile(dto: CreateDDFileDto, adminId: string) {
    const entityType = dto.entityType ?? 'BUSINESS';

    if (dto.applicationId) {
      const app = await this.prisma.agentApplication.findUnique({ where: { id: dto.applicationId } });
      if (!app) throw new NotFoundException('Application not found');
      const existing = await this.prisma.agentDDFile.findUnique({ where: { applicationId: dto.applicationId } });
      if (existing) throw new BadRequestException('A DD file already exists for this application');
    }

    const file = await this.prisma.agentDDFile.create({
      data: {
        applicationId: dto.applicationId ?? null,
        agentName: dto.agentName,
        entityType,
        states: dto.states ?? null,
        regionalOffice: dto.regionalOffice ?? null,
        stage: 'DD_IN_PROGRESS',
        documents: {
          create: DD_CATALOG.map((item) => {
            const applicable = !(item.businessOnly && entityType === 'INDIVIDUAL');
            return {
              code: item.code,
              section: item.section,
              label: item.label,
              present: false,
              status: applicable ? 'MISSING' : 'NA',
            };
          }),
        },
      },
      include: { documents: true },
    });

    await this.audit.log({
      action: 'agent.dd.file.create',
      adminId,
      entity: 'AgentDDFile',
      entityId: file.id,
      after: { agentName: file.agentName, entityType, applicationId: dto.applicationId ?? null },
    });
    return file;
  }

  /**
   * Convenience used when an application is approved: create the DD file from the
   * application's own data if one doesn't already exist. Returns the file or null
   * if it already existed (idempotent).
   */
  async ensureFileForApplication(applicationId: string, adminId: string) {
    const existing = await this.prisma.agentDDFile.findUnique({ where: { applicationId } });
    if (existing) return null;
    const app = await this.prisma.agentApplication.findUnique({ where: { id: applicationId } });
    if (!app) return null;
    const entityType = app.applicantType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'BUSINESS';
    const agentName = app.company?.trim() || `${app.firstName} ${app.lastName}`.trim();
    return this.createFile(
      {
        applicationId,
        agentName,
        entityType,
        states: app.businessState ?? undefined,
      },
      adminId,
    );
  }

  // ── Reads ─────────────────────────────────────────────────────────────────
  async list(stage?: string) {
    const files = await this.prisma.agentDDFile.findMany({
      where: stage ? { stage } : undefined,
      orderBy: { updatedAt: 'desc' },
      include: { documents: { select: { status: true } } },
    });
    // Attach a compliance summary per file (counts by status).
    return files.map((f) => {
      const counts = { OK: 0, EXPIRING: 0, EXPIRED: 0, MISSING: 0, NA: 0 } as Record<string, number>;
      for (const d of f.documents) counts[d.status] = (counts[d.status] ?? 0) + 1;
      const { documents: _documents, ...rest } = f;
      return { ...rest, summary: counts, compliant: counts.EXPIRED === 0 && counts.MISSING === 0 };
    });
  }

  async get(id: string) {
    const file = await this.prisma.agentDDFile.findUnique({
      where: { id },
      include: { documents: { orderBy: { code: 'asc' } } },
    });
    if (!file) throw new NotFoundException('DD file not found');
    return file;
  }

  /** Cross-file dashboard of documents needing attention + reviews due. */
  async attentionDashboard() {
    const [expiring, expired, missing, reviewsDue] = await Promise.all([
      this.prisma.agentDocument.count({ where: { status: 'EXPIRING' } }),
      this.prisma.agentDocument.count({ where: { status: 'EXPIRED' } }),
      this.prisma.agentDocument.count({ where: { status: 'MISSING' } }),
      this.prisma.agentDDFile.count({
        where: { nextReviewDueAt: { lte: new Date() }, stage: { in: ['ACTIVE', 'DD_IN_PROGRESS'] } },
      }),
    ]);
    return { expiring, expired, missing, reviewsDue };
  }

  // ── Document mutations ──────────────────────────────────────────────────────
  async updateDocument(fileId: string, code: string, dto: UpdateDocumentDto, adminId: string) {
    const doc = await this.prisma.agentDocument.findUnique({
      where: { ddFileId_code: { ddFileId: fileId, code } },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const catalog = DD_CATALOG.find((c) => c.code === code);
    const hasExpiry = catalog?.hasExpiry ?? true;
    const applicable = doc.status !== 'NA';

    const present = dto.present ?? doc.present;
    const expiry =
      dto.expiry === null ? null : dto.expiry !== undefined ? new Date(dto.expiry) : doc.expiry;
    const status = computeDocStatus({ present, applicable, hasExpiry, expiry });

    const before = { present: doc.present, expiry: doc.expiry, status: doc.status, dropboxUrl: doc.dropboxUrl };
    const updated = await this.prisma.agentDocument.update({
      where: { ddFileId_code: { ddFileId: fileId, code } },
      data: {
        present,
        expiry,
        status,
        notes: dto.notes ?? doc.notes,
        dropboxUrl: dto.dropboxUrl ?? doc.dropboxUrl,
      },
    });
    // Touch the parent so list ordering reflects activity.
    await this.prisma.agentDDFile.update({ where: { id: fileId }, data: { updatedAt: new Date() } });

    await this.audit.log({
      action: 'agent.dd.document.update',
      adminId,
      entity: 'AgentDocument',
      entityId: updated.id,
      before,
      after: { present, expiry, status, dropboxUrl: updated.dropboxUrl },
    });
    return updated;
  }

  /** Recomputes every document's status (e.g. nightly, as expiries pass). */
  async recomputeStatuses(fileId: string) {
    const docs = await this.prisma.agentDocument.findMany({ where: { ddFileId: fileId } });
    for (const doc of docs) {
      if (doc.status === 'NA') continue;
      const hasExpiry = DD_CATALOG.find((c) => c.code === doc.code)?.hasExpiry ?? true;
      const status = computeDocStatus({ present: doc.present, hasExpiry, expiry: doc.expiry });
      if (status !== doc.status) {
        await this.prisma.agentDocument.update({ where: { id: doc.id }, data: { status } });
      }
    }
    return this.get(fileId);
  }

  // ── File-level mutations ────────────────────────────────────────────────────
  async setStage(id: string, dto: SetStageDto, adminId: string) {
    const file = await this.prisma.agentDDFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('DD file not found');
    const data: { stage: string; onboardedAt?: Date } = { stage: dto.stage };
    // Stamp the onboarded date the first time the file goes ACTIVE.
    if (dto.stage === 'ACTIVE' && !file.onboardedAt) data.onboardedAt = new Date();
    const updated = await this.prisma.agentDDFile.update({ where: { id }, data });
    await this.audit.log({
      action: 'agent.dd.stage.change',
      adminId,
      entity: 'AgentDDFile',
      entityId: id,
      before: { stage: file.stage },
      after: { stage: dto.stage },
    });
    return updated;
  }

  async setRisk(id: string, dto: SetRiskDto, adminId: string) {
    const file = await this.prisma.agentDDFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('DD file not found');
    const updated = await this.prisma.agentDDFile.update({
      where: { id },
      data: { riskRating: dto.riskRating },
    });
    await this.audit.log({
      action: 'agent.dd.risk.change',
      adminId,
      entity: 'AgentDDFile',
      entityId: id,
      before: { riskRating: file.riskRating },
      after: { riskRating: dto.riskRating },
    });
    return updated;
  }

  async recordReview(id: string, dto: RecordReviewDto, adminId: string) {
    const file = await this.prisma.agentDDFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('DD file not found');
    const updated = await this.prisma.agentDDFile.update({
      where: { id },
      data: {
        lastReviewedAt: new Date(),
        reviewedBy: dto.reviewedBy,
        nextReviewDueAt: dto.nextReviewDueAt ? new Date(dto.nextReviewDueAt) : file.nextReviewDueAt,
      },
    });
    await this.audit.log({
      action: 'agent.dd.review.record',
      adminId,
      entity: 'AgentDDFile',
      entityId: id,
      after: { reviewedBy: dto.reviewedBy, nextReviewDueAt: updated.nextReviewDueAt },
    });
    return updated;
  }
}
