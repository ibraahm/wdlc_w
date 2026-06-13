import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { addHours } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { generateToken, hashToken } from '../common/crypto.util';

/**
 * Teller (branch employee) applications. A teller applies against an existing
 * agent branch code; compliance runs the background check, can correct the
 * branch code, and approval issues a portal login (TELLER role) via the same
 * one-time setup-link flow used for principals.
 */
@Injectable()
export class TellersService {
  private readonly logger = new Logger(TellersService.name);

  constructor(private prisma: PrismaService, private audit: AuditService, private mail: MailService) {}

  async submit(data: {
    branchCode: string; firstName: string; lastName: string; email: string; phone: string;
    addressLine?: string; city?: string; state?: string; zip?: string;
    signatureName?: string; signatureConsent: boolean;
  }, meta: { ip?: string; userAgent?: string }) {
    return this.prisma.tellerApplication.create({
      data: { ...data, signatureIp: meta.ip, signatureUserAgent: meta.userAgent },
    });
  }

  list(status?: string) {
    return this.prisma.tellerApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: { branchCode?: string; status?: string }, adminId: string) {
    const app = await this.prisma.tellerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Teller application not found');

    if (data.status === 'APPROVED') {
      const branchCode = data.branchCode ?? app.branchCode;
      // Tellers may only be approved into a real, active branch.
      const branch = await this.prisma.agentDDFile.findUnique({ where: { branchCode } });
      if (!branch) throw new BadRequestException(`No agent branch with code ${branchCode}`);
      if (branch.stage !== 'ACTIVE') throw new BadRequestException(`Branch ${branchCode} is not ACTIVE (${branch.stage})`);
      await this.provisionTeller(app.email, app.firstName, app.lastName, app.phone, branchCode, adminId);
    }

    const updated = await this.prisma.tellerApplication.update({
      where: { id },
      data: { ...(data.branchCode ? { branchCode: data.branchCode } : {}), ...(data.status ? { status: data.status } : {}) },
    });
    await this.audit.log({ action: 'teller.application.update', adminId, entity: 'TellerApplication', entityId: id, before: { status: app.status, branchCode: app.branchCode }, after: data });
    return updated;
  }

  private async provisionTeller(email: string, firstName: string, lastName: string, phone: string, branchCode: string, adminId: string) {
    const existing = await this.prisma.agentUser.findUnique({ where: { email } });
    if (existing) {
      await this.prisma.agentUser.update({ where: { id: existing.id }, data: { branchCode, role: 'TELLER', status: 'ACTIVE', active: true } });
      return;
    }
    const setupRaw = generateToken(32);
    const user = await this.prisma.agentUser.create({
      data: {
        email, firstName, lastName, phone, branchCode,
        role: 'TELLER', status: 'ACTIVE', active: true, emailVerified: true,
        passwordHash: await bcrypt.hash(generateToken(32), 12),
        resetToken: hashToken(setupRaw),
        resetTokenExpiry: addHours(new Date(), 48),
      },
    });
    try {
      await this.mail.sendPortalWelcome(email, setupRaw, firstName, branchCode);
    } catch (err) {
      this.logger.error(`teller welcome email failed for ${email}: ${(err as Error).message}`);
    }
    await this.audit.log({ action: 'teller.portal.provisioned', adminId, entity: 'AgentUser', entityId: user.id, after: { branchCode } });
  }
}
