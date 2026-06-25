import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DDService } from './dd.service';
import { CreateApplicationDto, SendDocuSignDto } from './dto/application.dto';
import { MailService } from '../common/mail.service';
import { RegionalService } from '../regional/regional.service';
import { DocuSignService } from '../docusign/docusign.service';
import { buildAgentApplicationPdf } from './application-pdf';

const APPLICATION_STATUSES = ['NEW', 'REVIEWING', 'APPROVED', 'REJECTED'] as const;

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private dd: DDService,
    private mail: MailService,
    private regional: RegionalService,
    private docusign: DocuSignService,
  ) {}

  async create(dto: CreateApplicationDto, ctx?: { ip?: string; userAgent?: string }) {
    if (dto.currentlyProvides && !dto.currentProvider?.trim()) {
      throw new BadRequestException('Current money transfer company name is required.');
    }
    if (dto.providedPast && !dto.pastProvider?.trim()) {
      throw new BadRequestException('Previous money transfer company name is required.');
    }
    if (!dto.signatureConsent || !dto.signatureName?.trim()) {
      throw new BadRequestException('Electronic signature is required.');
    }

    const app = await this.prisma.agentApplication.create({
      data: {
        applicantType: dto.applicantType ?? 'BUSINESS',
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company ?? null,
        businessStreet: dto.businessStreet,
        businessCountry: dto.businessCountry,
        businessState: dto.businessState ?? null,
        businessCity: dto.businessCity,
        businessZip: dto.businessZip,
        businessPhone: dto.businessPhone,
        email: dto.email,
        howFound: dto.howFound ?? null,
        howFoundOther: dto.howFoundOther ?? null,
        businessType: dto.businessType ?? null,
        businessTypeOther: dto.businessTypeOther ?? null,
        productsOffered: dto.productsOffered ?? null,
        currentlyProvides: dto.currentlyProvides ?? false,
        currentProvider: dto.currentProvider ?? null,
        currentProviderOther: dto.currentProviderOther ?? null,
        providedPast: dto.providedPast ?? false,
        pastProvider: dto.pastProvider ?? null,
        pastProviderOther: dto.pastProviderOther ?? null,
        declinedBefore: dto.declinedBefore ?? false,
        declinedExplain: dto.declinedExplain ?? null,
        preferredLanguage: dto.preferredLanguage ?? null,
        preferredLanguageOther: dto.preferredLanguageOther ?? null,
        monthlyVolume: dto.monthlyVolume ?? null,
        anticipatedDollarVolume: dto.anticipatedDollarVolume ?? null,
        totalLocations: dto.totalLocations ?? null,
        comments: dto.comments ?? null,
        signatureName: dto.signatureName.trim(),
        signatureTitle: dto.signatureTitle?.trim() || null,
        signatureConsent: dto.signatureConsent,
        signatureConsentText: dto.signatureConsentText,
        signatureClientTimestamp: dto.signatureClientTimestamp ? new Date(dto.signatureClientTimestamp) : null,
        signatureAcceptedAt: new Date(),
        signatureIp: ctx?.ip ?? null,
        // Prefer the browser-reported user-agent so the signature record is the
        // real browser, not the server-to-server hop ("node").
        signatureUserAgent: dto.signatureUserAgent?.trim() || ctx?.userAgent || null,
        ip: ctx?.ip ?? null,
        userAgent: dto.signatureUserAgent?.trim() || ctx?.userAgent || null,
      },
    });

    try {
      const pdf = await buildAgentApplicationPdf(app);
      await this.mail.sendAgentApplicationNotification({
        applicationId: app.id,
        applicantName: `${app.firstName} ${app.lastName}`.trim(),
        businessName: app.company,
        email: app.email,
        phone: app.businessPhone,
        pdf,
      });
    } catch (err) {
      this.logger.error(
        `agent application notification failed: id=${app.id} message=${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { ok: true, id: app.id };
  }

  async listAll(status?: string, adminId?: string, role?: string, archived = false) {
    if (status && !APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
      throw new BadRequestException('Invalid application status');
    }

    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;
    const where: any = {};
    if (status) where.status = status;
    if (scope) where.businessState = scope.states.length ? { in: scope.states } : '__none__';
    // Active queue hides archived records; the archived view shows only them.
    where.archivedAt = archived ? { not: null } : null;

    return this.prisma.agentApplication.findMany({
      where,
      include: {
        ddFile: {
          select: {
            id: true,
            stage: true,
            riskRating: true,
            updatedAt: true,
            archivedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Archive (and reversibly hide) an application and any linked DD file. Keeps
  // the full record + audit trail — the compliance-safe alternative to delete.
  async archive(id: string, adminId?: string) {
    const existing = await this.prisma.agentApplication.findUnique({
      where: { id },
      include: { ddFile: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Application not found');
    if (existing.archivedAt) return { ok: true };

    const now = new Date();
    await this.prisma.agentApplication.update({
      where: { id },
      data: { archivedAt: now, archivedBy: adminId ?? null },
    });
    if (existing.ddFile) {
      await this.prisma.agentDDFile.update({
        where: { id: existing.ddFile.id },
        data: { archivedAt: now, archivedBy: adminId ?? null },
      });
    }
    await this.audit.log({
      action: 'agent.application.archive',
      adminId,
      entity: 'AgentApplication',
      entityId: id,
      after: { archivedAt: now, ddFileArchived: !!existing.ddFile },
    });
    return { ok: true };
  }

  async unarchive(id: string, adminId?: string) {
    const existing = await this.prisma.agentApplication.findUnique({
      where: { id },
      include: { ddFile: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Application not found');

    await this.prisma.agentApplication.update({
      where: { id },
      data: { archivedAt: null, archivedBy: null },
    });
    if (existing.ddFile) {
      await this.prisma.agentDDFile.update({
        where: { id: existing.ddFile.id },
        data: { archivedAt: null, archivedBy: null },
      });
    }
    await this.audit.log({
      action: 'agent.application.unarchive',
      adminId,
      entity: 'AgentApplication',
      entityId: id,
    });
    return { ok: true };
  }

  // Hard delete, including a linked DD file — but ONLY when no evidence has been
  // collected, so compliance records are never destroyed. SUPER_ADMIN only
  // (enforced at the controller). Use archive for everything else.
  // DocuSign can be turned off at runtime via the 'docusign.enabled' setting
  // (default on), independent of whether the server env is configured.
  private async docuSignEnabled(): Promise<boolean> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'docusign.enabled' } });
    if (!row) return true;
    try {
      return JSON.parse(row.value) !== false;
    } catch {
      return true;
    }
  }

  async docuSignConfig() {
    const enabled = await this.docuSignEnabled();
    const configured = this.docusign.isConfigured();
    return { enabled, configured, available: enabled && configured };
  }

  // Send a (prefilled) PDF out for e-signature to the agent via DocuSign. The
  // file is streamed straight to DocuSign — nothing is stored; only the send is
  // audited (metadata, never the document bytes).
  async sendDocuSign(
    id: string,
    file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number } | undefined,
    dto: SendDocuSignDto,
    adminId?: string,
  ) {
    if (!file || !file.buffer?.length) throw new BadRequestException('A PDF file is required.');
    const isPdf = (file.mimetype || '').includes('pdf') || (file.originalname || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new BadRequestException('The uploaded file must be a PDF.');

    const app = await this.prisma.agentApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (!(await this.docuSignEnabled())) {
      throw new ServiceUnavailableException('DocuSign sending is turned off.');
    }
    if (!this.docusign.isConfigured()) {
      throw new ServiceUnavailableException('DocuSign is not configured on the server.');
    }

    const signerName = (dto.signerName || '').trim() || `${app.firstName} ${app.lastName}`.trim();
    const signerEmail = (dto.signerEmail || '').trim() || app.email;
    if (!signerEmail) throw new BadRequestException('A signer email is required.');

    const cc = (dto.cc || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ name: email, email }));

    const num = (v?: string) =>
      v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;
    const fileName = file.originalname || 'document.pdf';

    const { envelopeId } = await this.docusign.sendDocumentForSignature({
      pdfBase64: file.buffer.toString('base64'),
      fileName,
      emailSubject: (dto.emailSubject || '').trim() || 'World Direct Link — documents for your signature',
      signer: { name: signerName, email: signerEmail },
      cc,
      anchorString: dto.anchorString?.trim() || undefined,
      anchorXOffset: num(dto.anchorXOffset),
      anchorYOffset: num(dto.anchorYOffset),
      page: num(dto.page),
      x: num(dto.x),
      y: num(dto.y),
    });

    await this.audit.log({
      action: 'agent.application.docusign.send',
      adminId,
      entity: 'AgentApplication',
      entityId: id,
      after: { envelopeId, signerEmail, fileName, ccCount: cc.length },
    });
    return { envelopeId };
  }

  async forceRemove(id: string, adminId?: string) {
    const existing = await this.prisma.agentApplication.findUnique({
      where: { id },
      include: {
        ddFile: { include: { documents: { select: { present: true, dropboxUrl: true } } } },
      },
    });
    if (!existing) throw new NotFoundException('Application not found');

    if (existing.ddFile) {
      const hasEvidence = existing.ddFile.documents.some(
        (d) => d.present || (d.dropboxUrl && d.dropboxUrl.trim()),
      );
      if (hasEvidence) {
        throw new BadRequestException(
          'This DD file has collected evidence and cannot be permanently deleted. Archive it instead.',
        );
      }
      // Documents cascade with the DD file; the application FK is Restrict, so
      // the file must be removed before the application.
      await this.prisma.agentDDFile.delete({ where: { id: existing.ddFile.id } });
    }

    await this.prisma.agentApplication.delete({ where: { id } });
    await this.audit.log({
      action: 'agent.application.force_delete',
      adminId,
      entity: 'AgentApplication',
      entityId: id,
      before: {
        status: existing.status,
        applicant: `${existing.firstName} ${existing.lastName}`.trim(),
        company: existing.company,
        hadDdFile: !!existing.ddFile,
      },
    });
    return { ok: true };
  }

  // Correct the business/service address on an application (e.g. a home address
  // was entered). Allowed even when locked; the DD file reads address from here.
  async updateAddress(
    id: string,
    dto: {
      businessStreet: string;
      businessCountry: string;
      businessState: string;
      businessCity: string;
      businessZip: string;
      businessPhone: string;
    },
    adminId?: string,
  ) {
    const existing = await this.prisma.agentApplication.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Application not found');

    const before = {
      businessStreet: existing.businessStreet,
      businessCity: existing.businessCity,
      businessState: existing.businessState,
      businessZip: existing.businessZip,
      businessCountry: existing.businessCountry,
      businessPhone: existing.businessPhone,
    };
    const updated = await this.prisma.agentApplication.update({
      where: { id },
      data: {
        businessStreet: dto.businessStreet,
        businessCountry: dto.businessCountry,
        businessState: dto.businessState,
        businessCity: dto.businessCity,
        businessZip: dto.businessZip,
        businessPhone: dto.businessPhone,
      },
    });
    await this.audit.log({
      action: 'agent.application.address.update',
      adminId,
      entity: 'AgentApplication',
      entityId: id,
      before,
      after: {
        businessStreet: dto.businessStreet,
        businessCity: dto.businessCity,
        businessState: dto.businessState,
        businessZip: dto.businessZip,
        businessCountry: dto.businessCountry,
        businessPhone: dto.businessPhone,
      },
    });
    return updated;
  }

  async setStatus(id: string, status: string, adminId?: string) {
    if (!APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
      throw new BadRequestException('Invalid application status');
    }

    const existing = await this.prisma.agentApplication.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Application not found');

    const updated = await this.prisma.agentApplication.update({ where: { id }, data: { status } });

    // Audit every transition (previously unlogged - compliance gap).
    await this.audit.log({
      action: 'agent.application.status.change',
      adminId,
      entity: 'AgentApplication',
      entityId: id,
      before: { status: existing.status },
      after: { status },
    });

    // On approval, open the agent's DD file so onboarding can begin (idempotent).
    if (status === 'APPROVED' && adminId) {
      await this.dd.ensureFileForApplication(id, adminId);
    }
    return updated;
  }

  async remove(id: string, adminId?: string) {
    const existing = await this.prisma.agentApplication.findUnique({
      where: { id },
      include: { ddFile: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Application not found');
    if (existing.ddFile || existing.status === 'APPROVED') {
      throw new BadRequestException('Cannot delete an approved application or one linked to a DD file');
    }

    await this.prisma.agentApplication.delete({ where: { id } });
    await this.audit.log({
      action: 'agent.application.delete',
      adminId,
      entity: 'AgentApplication',
      entityId: id,
      before: {
        status: existing.status,
        applicant: `${existing.firstName} ${existing.lastName}`.trim(),
        company: existing.company,
      },
    });
    return { ok: true };
  }
}
