import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { addHours } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { RegionalService } from '../regional/regional.service';
import { generateToken, hashToken } from '../common/crypto.util';
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
    private audit: AuditService, private mail: MailService,
    private regional: RegionalService) {}

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

    // Auto-assign the regional office that covers the agent's (first) state.
    const firstState = (states ?? '').split(',')[0]?.trim() || null;
    const office = await this.regional.officeForState(firstState);

    const file = await this.prisma.agentDDFile.create({
      data: {
        applicationId: dto.applicationId ?? null,
        agentName,
        entityType,
        states,
        regionalOfficeId: office?.id ?? null,
        regionalOffice: dto.regionalOffice ?? (office ? `${office.name} (${office.code})` : null),
        // Step 2 (DD) is only reachable once step 1 (the application) is in hand.
        // Files opened from an application begin collecting documents; files
        // created manually start at the application step and must progress.
        stage: dto.applicationId ? 'DD_IN_PROGRESS' : 'APPLICATION',
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
  async list(stage?: string, adminId?: string, role?: string) {
    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;
    const where: any = {};
    if (stage) where.stage = stage;
    if (scope) where.regionalOfficeId = scope.officeId ?? '__none__';
    const files = await this.prisma.agentDDFile.findMany({
      where,
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

  /**
   * Active agent register: every branch that is live (ACTIVE) or on hold
   * (SUSPENDED) with its assigned branch code, each joined to the portal users
   * (principals + tellers) provisioned under that code. Surfaces ongoing review
   * dates so active agents get revisited.
   */
  async listActiveBranches() {
    const files = await this.prisma.agentDDFile.findMany({
      where: { stage: { in: ['ACTIVE', 'SUSPENDED'] }, branchCode: { not: null } },
      orderBy: [{ stage: 'asc' }, { nextReviewDueAt: 'asc' }],
      include: { documents: { select: { status: true } }, application: { select: APPLICATION_SELECT } },
    });
    const codes = files.map((f) => f.branchCode!).filter(Boolean);
    const users = codes.length
      ? await this.prisma.agentUser.findMany({
          where: { branchCode: { in: codes } },
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            role: true, status: true, active: true, branchCode: true, lastLoginAt: true, createdAt: true,
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        })
      : [];
    const byCode = new Map<string, typeof users>();
    for (const u of users) {
      if (!u.branchCode) continue;
      if (!byCode.has(u.branchCode)) byCode.set(u.branchCode, []);
      byCode.get(u.branchCode)!.push(u);
    }
    const now = Date.now();
    return files.map((f) => {
      const counts = { OK: 0, EXPIRING: 0, EXPIRED: 0, MISSING: 0, NA: 0 } as Record<string, number>;
      for (const d of f.documents) counts[d.status] = (counts[d.status] ?? 0) + 1;
      const { documents: _documents, ...rest } = f;
      const reviewDue = !!f.nextReviewDueAt && new Date(f.nextReviewDueAt).getTime() <= now;
      return {
        ...rest,
        summary: counts,
        compliant: counts.EXPIRED === 0 && counts.MISSING === 0,
        reviewDue,
        users: byCode.get(f.branchCode!) ?? [],
      };
    });
  }

  /**
   * Re-issue a portal account-setup link to a branch user who hasn't completed
   * setup (e.g. never signed in, or the original link expired). Generates a
   * fresh single-use 48h token and re-sends the welcome email.
   */
  async resendPortalSetup(userId: string, adminId: string) {
    const user = await this.prisma.agentUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Portal user not found');
    if (!user.branchCode) throw new BadRequestException('User is not assigned to a branch');

    const setupRaw = generateToken(32);
    await this.prisma.agentUser.update({
      where: { id: userId },
      data: { resetToken: hashToken(setupRaw), resetTokenExpiry: addHours(new Date(), 48), active: true },
    });
    try {
      await this.mail.sendPortalWelcome(user.email, setupRaw, user.firstName, user.branchCode);
    } catch (err) {
      throw new BadRequestException(`Could not send email: ${(err as Error).message}`);
    }
    await this.audit.log({ action: 'agent.portal.resend_setup', adminId, entity: 'AgentUser', entityId: userId, after: { email: user.email } });
    return { ok: true };
  }

  /** Manually mark a branch user's email verified and the account active. */
  async verifyPortalUser(userId: string, adminId: string) {
    const user = await this.prisma.agentUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Portal user not found');
    await this.prisma.agentUser.update({
      where: { id: userId },
      data: { emailVerified: true, active: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });
    await this.audit.log({ action: 'agent.portal.verify_activate', adminId, entity: 'AgentUser', entityId: userId, after: { email: user.email } });
    return { ok: true };
  }

  async get(id: string, adminId?: string, role?: string) {
    const file = await this.prisma.agentDDFile.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { code: 'asc' } },
        application: { select: APPLICATION_SELECT },
      },
    });
    if (!file) throw new NotFoundException('DD file not found');
    // Regional officers may only open files within their office.
    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;
    if (scope && file.regionalOfficeId !== scope.officeId) throw new NotFoundException('DD file not found');
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
  // The onboarding pipeline is strictly ordered: a file cannot reach a later
  // step without completing the earlier ones (you can't get to step 2 - DD - or
  // beyond without going through the application/review step first). Backward
  // moves, suspension, and termination remain available.
  private assertStageTransition(from: string, to: string) {
    if (from === to) return;
    const PIPELINE = ['APPLICATION', 'UNDER_REVIEW', 'DD_IN_PROGRESS', 'ACTIVE'];

    if (to === 'TERMINATED') return; // a file can always be offboarded
    if (from === 'TERMINATED') {
      throw new BadRequestException('A terminated file cannot be reopened - create a new file');
    }
    if (to === 'SUSPENDED') {
      if (from === 'DD_IN_PROGRESS' || from === 'ACTIVE') return;
      throw new BadRequestException('Only a file in due diligence or active can be suspended');
    }
    if (from === 'SUSPENDED') {
      if (to === 'ACTIVE' || to === 'DD_IN_PROGRESS') return;
      throw new BadRequestException('A suspended file can only resume to due diligence or active');
    }

    const fi = PIPELINE.indexOf(from);
    const ti = PIPELINE.indexOf(to);
    if (fi === -1 || ti === -1) throw new BadRequestException('Invalid stage transition');
    if (ti > fi + 1) {
      throw new BadRequestException(
        `Cannot skip ahead to ${to} - complete the ${PIPELINE[fi + 1]} step first`,
      );
    }
    // backward moves (ti < fi) and a single step forward (ti === fi + 1) are allowed
  }

  private readonly logger = new Logger(DDService.name);

  /** Manually assign the agent's permanent 6-char branch code (unique system-wide). */
  async setBranchCode(id: string, branchCode: string, adminId: string) {
    const file = await this.prisma.agentDDFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('DD file not found');
    const clash = await this.prisma.agentDDFile.findUnique({ where: { branchCode } });
    if (clash && clash.id !== id) throw new BadRequestException(`Branch code ${branchCode} is already assigned to ${clash.agentName}`);
    const updated = await this.prisma.agentDDFile.update({ where: { id }, data: { branchCode } });
    await this.audit.log({ action: 'agent.dd.branch_code.set', adminId, entity: 'AgentDDFile', entityId: id, before: { branchCode: file.branchCode }, after: { branchCode } });
    return updated;
  }

  /**
   * Activation side effect: issue a portal login for the principal. Creates the
   * account from the linked application with an unusable password and emails a
   * single-use 48h setup link. Idempotent - an existing account is re-linked.
   */
  private async provisionPortalAccount(file: { id: string; branchCode: string | null; applicationId: string | null }, adminId: string) {
    if (!file.applicationId || !file.branchCode) return;
    const app = await this.prisma.agentApplication.findUnique({
      where: { id: file.applicationId },
      select: { email: true, firstName: true, lastName: true, businessPhone: true },
    });
    if (!app?.email) return;

    const existing = await this.prisma.agentUser.findUnique({ where: { email: app.email } });
    if (existing) {
      await this.prisma.agentUser.update({
        where: { id: existing.id },
        data: { branchCode: file.branchCode, status: 'ACTIVE', active: true },
      });
      await this.audit.log({ action: 'agent.portal.relinked', adminId, entity: 'AgentUser', entityId: existing.id, after: { branchCode: file.branchCode } });
      return;
    }

    const setupRaw = generateToken(32);
    const user = await this.prisma.agentUser.create({
      data: {
        email: app.email,
        firstName: app.firstName,
        lastName: app.lastName,
        phone: app.businessPhone,
        branchCode: file.branchCode,
        role: 'PRINCIPAL',
        status: 'ACTIVE',
        active: true,
        emailVerified: true, // the setup link proves mailbox control
        // No usable password until the agent sets one via the emailed link.
        passwordHash: await bcrypt.hash(generateToken(32), 12),
        resetToken: hashToken(setupRaw),
        resetTokenExpiry: addHours(new Date(), 48),
      },
    });
    try {
      await this.mail.sendPortalWelcome(app.email, setupRaw, app.firstName, file.branchCode);
    } catch (err) {
      this.logger.error(`portal welcome email failed for ${app.email}: ${(err as Error).message}`);
    }
    await this.audit.log({ action: 'agent.portal.provisioned', adminId, entity: 'AgentUser', entityId: user.id, after: { branchCode: file.branchCode } });
  }

  async setStage(id: string, dto: SetStageDto, adminId: string) {
    const file = await this.prisma.agentDDFile.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!file) throw new NotFoundException('DD file not found');

    this.assertStageTransition(file.stage, dto.stage);

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

    // Lifecycle side effects: ACTIVE issues portal credentials for the branch;
    // SUSPENDED/TERMINATED cuts portal access for everyone on the branch.
    if (dto.stage === 'ACTIVE') {
      await this.provisionPortalAccount(updated as { id: string; branchCode: string | null; applicationId: string | null }, adminId);
    } else if ((dto.stage === 'SUSPENDED' || dto.stage === 'TERMINATED') && updated.branchCode) {
      await this.prisma.agentUser.updateMany({ where: { branchCode: updated.branchCode }, data: { active: false } });
    }
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
    if (!(file as { branchCode?: string | null }).branchCode) blockers.push('branch code must be assigned');
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
    // Reviewer is the signed-in admin (tamper-proof), date is stamped now.
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId }, select: { name: true, email: true } });
    const reviewedBy = admin?.name || admin?.email || dto.reviewedBy || 'Unknown';
    const updated = await this.prisma.agentDDFile.update({
      where: { id },
      data: {
        lastReviewedAt: new Date(),
        reviewedBy,
        nextReviewDueAt: dto.nextReviewDueAt ? new Date(dto.nextReviewDueAt) : file.nextReviewDueAt,
      },
    });
    await this.audit.log({
      action: 'agent.dd.review.record',
      adminId,
      entity: 'AgentDDFile',
      entityId: id,
      after: { reviewedBy, nextReviewDueAt: updated.nextReviewDueAt },
    });
    return updated;
  }
}
