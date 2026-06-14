import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DDService } from './dd.service';
import { CreateApplicationDto } from './dto/application.dto';
import { MailService } from '../common/mail.service';
import { RegionalService } from '../regional/regional.service';
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
        totalLocations: dto.totalLocations ?? null,
        comments: dto.comments ?? null,
        signatureName: dto.signatureName.trim(),
        signatureTitle: dto.signatureTitle?.trim() || null,
        signatureConsent: dto.signatureConsent,
        signatureConsentText: dto.signatureConsentText,
        signatureClientTimestamp: dto.signatureClientTimestamp ? new Date(dto.signatureClientTimestamp) : null,
        signatureAcceptedAt: new Date(),
        signatureIp: ctx?.ip ?? null,
        signatureUserAgent: ctx?.userAgent ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
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

  async listAll(status?: string, adminId?: string, role?: string) {
    if (status && !APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
      throw new BadRequestException('Invalid application status');
    }

    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;
    const where: any = {};
    if (status) where.status = status;
    if (scope) where.businessState = scope.states.length ? { in: scope.states } : '__none__';

    return this.prisma.agentApplication.findMany({
      where,
      include: {
        ddFile: {
          select: {
            id: true,
            stage: true,
            riskRating: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
