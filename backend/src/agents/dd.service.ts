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

const APPLICATION_SELECT = {
  id: true,
  applicantType: true,
  firstName: true,
  lastName: true,
  company: true,
  businessStreet: true,
  businessCountry: true,
  businessState: true,
  businessCity: true,
  businessZip: true,
  businessPhone: true,
  email: true,
  howFound: true,
  howFoundOther: true,
  businessType: true,
  businessTypeOther: true,
  productsOffered: true,
  currentlyProvides: true,
  currentProvider: true,
  currentProviderOther: true,
  providedPast: true,
  pastProvider: true,
  pastProviderOther: true,
  declinedBefore: true,
  declinedExplain: true,
  preferredLanguage: true,
  preferredLanguageOther: true,
  monthlyVolume: true,
  totalLocations: true,
  comments: true,
  signatureName: true,
  signatureTitle: true,
  signatureConsent: true,
  signatureConsentText: true,
  signatureClientTimestamp: true,
  signatureAcceptedAt: true,
  signatureIp: true,
  signatureUserAgent: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
    let entityType = dto.entityType ?? 'BUSINESS';
    let agentName = dto.agentName;
    let states = dto.states ?? null;
    let sourceApplication: {
      applicantType: string;
      firstName: string;
      lastName: string;
      company: string | null;
      businessState: string | null;
      monthlyVolume: string | null;
      totalLocations: string | null;
    } | null = null;

    if (dto.applicationId) {
      const app = await this.prisma.agentApplication.findUnique({
        where: { id: dto.applicationId },
        select: {
          applicantType: true,
          firstName: true,
          lastName: true,
          company: true,
          businessState: true,
          monthlyVolume: true,
          totalLocations: true,
        },
      });
      if (!app) throw new NotFoundException('Application not found');
      sourceApplication = app;
      entityType = app.applicantType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'BUSINESS';
      agentName = app.company?.trim() || `${app.firstName} ${app.lastName}`.trim();
      states = app.businessState ?? states;
      const existing = await this.prisma.agentDDFile.findUnique({ where: { applicationId: dto.applicationId } });
      if (existing) throw new BadRequestException('A DD file already exists for this application');
    }

    const hasCapturedVolume = !!sourceApplication?.monthlyVolume || !!sourceApplication?.totalLocations;

    const file = await this.prisma.agentDDFile.create({
      data: {
        applicationId: dto.applicationId ?? null,
        agentName,
        entityType,
        states,
        regionalOffice: dto.regionalOffice ?? null,
        stage: 'DD_IN_PROGRESS',
        documents: {
          create: DD_CATALOG.map((item) => {
            const applicable = !(item.businessOnly && entityType === 'INDIVIDUAL');
            const capturedFromApplication = dto.applicationId && item.code === 'r0';
            const capturedVolume = dto.applicationId && item.code === 'r11' && hasCapturedVolume;
            return {
              code: item.code,
              section: item.section,
              label: item.label,
              present: !!(applicable && (capturedFromApplication || capturedVolume)),
              status: !applicable ? 'NA' : capturedFromApplication || capturedVolume ? 'OK' : 'MISSING',
              notes: capturedFromApplication
                ? 'Captured from public Become an Agent application.'
                : capturedVolume
                  ? 'Anticipated volume captured in public application.'
                  : null,
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
      include: {
        documents: { select: { status: true } },
        application: { select: APPLICATION_SELECT },
      },
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
      include: {
        documents: { orderBy: { code: 'asc' } },
        application: { select: APPLICATION_SELECT },
      },
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

  /**
   * Recomputes statuses across ALL files (nightly job entry point). Only writes
   * rows whose status actually changed; returns how many transitioned.
   */
  async recomputeAllStatuses(): Promise<{ scanned: number; changed: number }> {
    const docs = await this.prisma.agentDocument.findMany({
      where: { status: { not: 'NA' } },
    });
    let changed = 0;
    for (const doc of docs) {
      const hasExpiry = DD_CATALOG.find((c) => c.code === doc.code)?.hasExpiry ?? true;
      const status = computeDocStatus({ present: doc.present, hasExpiry, expiry: doc.expiry });
      if (status !== doc.status) {
        await this.prisma.agentDocument.update({ where: { id: doc.id }, data: { status } });
        changed++;
      }
    }
    return { scanned: docs.length, changed };
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
    const file = await this.prisma.agentDDFile.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!file) throw new NotFoundException('DD file not found');

    if (dto.stage === 'ACTIVE') {
      const blockers = this.getActivationBlockers(file);
      if (blockers.length > 0) {
        throw new BadRequestException(`Cannot activate DD file: ${blockers.join('; ')}`);
      }
    }

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

  private getActivationBlockers(file: {
    riskRating: string | null;
    lastReviewedAt: Date | null;
    reviewedBy: string | null;
    documents: Array<{
      code: string;
      label: string;
      present: boolean;
      expiry: Date | null;
      status: string;
    }>;
  }): string[] {
    const blockers: string[] = [];

    if (!file.riskRating) blockers.push('risk rating is required');
    if (!file.lastReviewedAt || !file.reviewedBy) blockers.push('compliance review must be recorded');

    const incompleteDocs = file.documents
      .filter((doc) => {
        if (doc.status === 'NA') return false;
        const catalog = DD_CATALOG.find((item) => item.code === doc.code);
        if (catalog?.section === 'ONGOING') return false;
        const status = computeDocStatus({
          present: doc.present,
          applicable: true,
          hasExpiry: catalog?.hasExpiry ?? true,
          expiry: doc.expiry,
        });
        return status !== 'OK';
      })
      .map((doc) => doc.label);

    if (incompleteDocs.length > 0) {
      blockers.push(`required onboarding documents incomplete: ${incompleteDocs.join(', ')}`);
    }

    return blockers;
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
