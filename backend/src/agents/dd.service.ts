import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { addHours } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { RegionalService } from '../regional/regional.service';
import { generateToken, hashToken } from '../common/crypto.util';
import { DD_CATALOG, STAGE_TRANSITIONS, allowedNextStages } from './dd-catalog';
import { computeDocStatus, effectiveDueDate } from './dd-status.util';
import { buildDdFilePdf, type DdFileDocRow } from './dd-file-pdf';
import { buildAgentApplicationPdf } from './application-pdf';
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
  anticipatedDollarVolume: true,
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
    const where: any = { archivedAt: null };
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
      where: { stage: { in: ['ACTIVE', 'SUSPENDED'] }, branchCode: { not: null }, archivedAt: null },
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

  /**
   * Set a portal user's password to the standard branch-based credential
   * (<BRANCHCODE>@2026WDLC) and activate the account, so an admin can hand a
   * working login to an agent or teller. Returns the plaintext exactly once so
   * it can be shared; it is never written to the audit log.
   */
  async generatePortalPassword(userId: string, adminId: string) {
    const user = await this.prisma.agentUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Portal user not found');
    if (!user.branchCode) throw new BadRequestException('User is not assigned to a branch');

    const password = `${user.branchCode.toUpperCase()}@2026WDLC`;
    await this.prisma.agentUser.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
        active: true,
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
        resetToken: null,
        resetTokenExpiry: null,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
    await this.audit.log({
      action: 'agent.portal.password_generated', adminId, entity: 'AgentUser', entityId: userId,
      after: { email: user.email, role: user.role, branchCode: user.branchCode },
    });
    return { ok: true, email: user.email, password };
  }

  async get(id: string, adminId?: string, role?: string) {
    const file = await this.prisma.agentDDFile.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { code: 'asc' } },
        application: { select: APPLICATION_SELECT },
        signatures: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!file) throw new NotFoundException('DD file not found');
    // Regional officers may only open files within their office.
    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;
    if (scope && file.regionalOfficeId !== scope.officeId) throw new NotFoundException('DD file not found');
    // Enrich each document with its catalog date policy + computed due date so
    // the UI can label the date as received/expiry and show the recheck date.
    const documents = file.documents.map((d) => {
      const cat = DD_CATALOG.find((c) => c.code === d.code);
      const dateBasis = cat?.dateBasis ?? 'EXPIRY';
      const recheckMonths = cat?.recheckMonths ?? null;
      return {
        ...d,
        dateBasis,
        recheckMonths,
        dueDate: effectiveDueDate(dateBasis, cat?.recheckMonths, d.expiry),
      };
    });
    // Lifecycle hints drive the guided pipeline UI: which stages are reachable
    // next and what (if anything) still blocks activation.
    const blockers = this.getActivationBlockers(file);
    const lifecycle = {
      allowedStages: allowedNextStages(file.stage),
      blockers,
      readyForActivation: blockers.length === 0,
    };
    return { ...file, documents, lifecycle };
  }

  // ── Manual document-signature tracking (sent / signed, by hand) ─────────────
  async addSignatureDoc(
    ddFileId: string,
    dto: { label: string; method?: string },
    adminId?: string,
  ) {
    const file = await this.prisma.agentDDFile.findUnique({ where: { id: ddFileId }, select: { id: true } });
    if (!file) throw new NotFoundException('DD file not found');
    const label = (dto.label || '').trim();
    if (!label) throw new BadRequestException('A document name is required.');
    const row = await this.prisma.dDSignatureDoc.create({
      data: { ddFileId, label, method: dto.method?.trim() || null },
    });
    await this.audit.log({ action: 'agent.dd.signature.add', adminId, entity: 'DDSignatureDoc', entityId: row.id, after: { ddFileId, label } });
    return row;
  }

  async updateSignatureDoc(
    id: string,
    dto: { label?: string; status?: string; method?: string | null; sentAt?: string | null; signedAt?: string | null; notes?: string | null },
    adminId?: string,
  ) {
    const existing = await this.prisma.dDSignatureDoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tracking row not found');

    const status = dto.status ?? existing.status;
    if (!['PENDING', 'SENT', 'SIGNED', 'DECLINED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    // Stamp sent/signed dates from the status transition unless explicitly given.
    let sentAt = dto.sentAt !== undefined ? (dto.sentAt ? new Date(dto.sentAt) : null) : existing.sentAt;
    let signedAt = dto.signedAt !== undefined ? (dto.signedAt ? new Date(dto.signedAt) : null) : existing.signedAt;
    if (dto.status) {
      if ((status === 'SENT' || status === 'SIGNED') && !sentAt) sentAt = new Date();
      if (status === 'SIGNED' && !signedAt) signedAt = new Date();
    }

    const updated = await this.prisma.dDSignatureDoc.update({
      where: { id },
      data: {
        label: dto.label?.trim() || existing.label,
        status,
        method: dto.method !== undefined ? (dto.method?.trim() || null) : existing.method,
        sentAt,
        signedAt,
        notes: dto.notes !== undefined ? (dto.notes?.trim() || null) : existing.notes,
      },
    });
    await this.audit.log({ action: 'agent.dd.signature.update', adminId, entity: 'DDSignatureDoc', entityId: id, before: { status: existing.status }, after: { status } });
    return updated;
  }

  async deleteSignatureDoc(id: string, adminId?: string) {
    const existing = await this.prisma.dDSignatureDoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tracking row not found');
    await this.prisma.dDSignatureDoc.delete({ where: { id } });
    await this.audit.log({ action: 'agent.dd.signature.delete', adminId, entity: 'DDSignatureDoc', entityId: id, before: { label: existing.label } });
    return { ok: true };
  }

  // The shared company logo (siteSetting brand.logo) as a decoded buffer.
  private async brandLogoBuffer(): Promise<Buffer | undefined> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'brand.logo' } });
    if (!row) return undefined;
    const url = JSON.parse(row.value) as string | null;
    if (!url) return undefined;
    const comma = url.indexOf(',');
    return Buffer.from(comma >= 0 ? url.slice(comma + 1) : url, 'base64');
  }

  // The configurable company address (siteSetting brand.address) for PDF headers.
  private async brandAddress(): Promise<string | null> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'brand.address' } });
    return row ? (JSON.parse(row.value) as string | null) : null;
  }

  private safeFileName(name: string): string {
    return (name || 'agent').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') || 'agent';
  }

  // Professional one-page PDF of the agent's application form (no IP / user-agent).
  async exportApplicationPdf(id: string, adminId?: string, role?: string): Promise<{ pdf: Buffer; filename: string }> {
    const file = await this.get(id, adminId, role);
    const app = (file as any).application;
    if (!app) throw new BadRequestException('No application is linked to this DD file');
    const [logo, address] = await Promise.all([this.brandLogoBuffer(), this.brandAddress()]);
    const pdf = await buildAgentApplicationPdf(app, { logo, address });
    if (adminId) {
      await this.audit.log({ action: 'agent.application.export', adminId, entity: 'AgentApplication', entityId: app.id });
    }
    return { pdf, filename: `application-${this.safeFileName(file.agentName)}.pdf` };
  }

  // Branded, regulator-presentable PDF of the whole DD file.
  async exportFilePdf(id: string, generatedBy: string, adminId?: string, role?: string): Promise<{ pdf: Buffer; filename: string }> {
    const file = await this.get(id, adminId, role);
    const app = (file as any).application;
    const documents: DdFileDocRow[] = (file.documents ?? []).map((d) => {
      const cat = DD_CATALOG.find((c) => c.code === d.code);
      const dateBasis = cat?.dateBasis ?? 'EXPIRY';
      return {
        section: (cat?.section ?? 'DOCUMENTATION') as DdFileDocRow['section'],
        label: cat?.label ?? d.code,
        status: d.status as DdFileDocRow['status'],
        present: d.present,
        expiry: d.expiry ?? null,
        dueDate: effectiveDueDate(dateBasis, cat?.recheckMonths, d.expiry),
        dateBasis,
      };
    });
    const address = app
      ? [app.businessStreet, [app.businessCity, app.businessState, app.businessZip].filter(Boolean).join(', '), app.businessCountry]
          .filter(Boolean).join(' · ')
      : null;

    const [logo, companyAddress] = await Promise.all([this.brandLogoBuffer(), this.brandAddress()]);

    const pdf = await buildDdFilePdf(
      {
        generatedAt: new Date(),
        generatedBy,
        agentName: file.agentName,
        entityType: file.entityType,
        branchCode: file.branchCode,
        states: file.states,
        stage: file.stage,
        riskRating: file.riskRating,
        onboardedAt: file.onboardedAt,
        lastReviewedAt: file.lastReviewedAt,
        reviewedBy: file.reviewedBy,
        nextReviewDueAt: file.nextReviewDueAt,
        business: { company: app?.company ?? null, address, email: app?.email ?? null, phone: app?.businessPhone ?? null },
        documents,
      },
      { logo, address: companyAddress },
    );
    if (adminId) {
      await this.audit.log({ action: 'agent.dd.file.export', adminId, entity: 'AgentDDFile', entityId: id, after: { records: documents.length } });
    }
    return { pdf, filename: `dd-checklist-${this.safeFileName(file.agentName)}.pdf` };
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
    const dateBasis = catalog?.dateBasis ?? 'EXPIRY';
    const recheckMonths = catalog?.recheckMonths;
    const applicable = doc.status !== 'NA';

    const present = dto.present ?? doc.present;
    // A NONE-basis document never carries a date. For the rest the stored date
    // is either an expiry or a received date; validate it's real and within a
    // viable window (guards against typos like year 0005 / 9999).
    let expiry =
      dto.expiry === null ? null : dto.expiry !== undefined ? new Date(dto.expiry) : doc.expiry;
    if (dateBasis === 'NONE') {
      expiry = null;
    } else if (dto.expiry) {
      if (!expiry || isNaN(expiry.getTime())) throw new BadRequestException('Enter a valid date');
      const year = expiry.getUTCFullYear();
      const maxYear = new Date().getUTCFullYear() + 30;
      if (year < 2000 || year > maxYear) {
        throw new BadRequestException(`Enter a real date — the year must be between 2000 and ${maxYear}`);
      }
    }
    const status = computeDocStatus({ present, applicable, dateBasis, recheckMonths, date: expiry });

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
      const cat = DD_CATALOG.find((c) => c.code === doc.code);
      const status = computeDocStatus({ present: doc.present, dateBasis: cat?.dateBasis ?? 'EXPIRY', recheckMonths: cat?.recheckMonths, date: doc.expiry });
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
      const cat = DD_CATALOG.find((c) => c.code === doc.code);
      const status = computeDocStatus({ present: doc.present, dateBasis: cat?.dateBasis ?? 'EXPIRY', recheckMonths: cat?.recheckMonths, date: doc.expiry });
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
    if (from === 'TERMINATED') {
      throw new BadRequestException('A terminated file cannot be reopened - create a new file');
    }
    if (!STAGE_TRANSITIONS[from as keyof typeof STAGE_TRANSITIONS]?.includes(to as never)) {
      throw new BadRequestException(`Cannot move from ${from} to ${to}`);
    }
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
          dateBasis: catalog?.dateBasis ?? 'EXPIRY',
          recheckMonths: catalog?.recheckMonths,
          date: doc.expiry,
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
    let nextReviewDueAt = file.nextReviewDueAt;
    if (dto.nextReviewDueAt) {
      const d = new Date(dto.nextReviewDueAt);
      const year = d.getUTCFullYear();
      const maxYear = new Date().getUTCFullYear() + 30;
      if (isNaN(d.getTime()) || year < 2000 || year > maxYear) {
        throw new BadRequestException(`Enter a real next-review date — the year must be between 2000 and ${maxYear}`);
      }
      nextReviewDueAt = d;
    }
    const updated = await this.prisma.agentDDFile.update({
      where: { id },
      data: { lastReviewedAt: new Date(), reviewedBy, nextReviewDueAt },
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
