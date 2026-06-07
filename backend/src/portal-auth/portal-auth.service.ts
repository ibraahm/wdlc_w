import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { addDays, addHours, addMinutes } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { generateToken, hashToken } from '../common/crypto.util';
import {
  BCRYPT_ROUNDS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
  AGENT_AT_EXPIRES,
  AGENT_RT_DAYS,
  EMAIL_VERIFY_HOURS,
  PASSWORD_RESET_MINUTES,
} from '../common/security.constants';
import { AgentSignupDto, AgentChangePasswordDto } from './dto/portal-auth.dto';

const safeAgent = (a: any) => ({
  id: a.id,
  email: a.email,
  firstName: a.firstName,
  lastName: a.lastName,
  phone: a.phone,
  status: a.status,
  emailVerified: a.emailVerified,
});

@Injectable()
export class PortalAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private mail: MailService,
  ) {}

  // ── Signup ────────────────────────────────────────────────────────────────
  async signup(dto: AgentSignupDto, ip?: string, ua?: string) {
    const existing = await this.prisma.agentUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const verifyRaw = generateToken(32);
    const verifyHash = hashToken(verifyRaw);

    const agent = await this.prisma.agentUser.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        emailVerifyToken: verifyHash,
        emailVerifyExpiry: addHours(new Date(), EMAIL_VERIFY_HOURS),
        active: false,
        emailVerified: false,
        status: 'PENDING',
      },
    });

    this.mail.sendEmailVerification(dto.email, verifyRaw);
    await this.audit.log({ action: 'agent.signup', agentId: agent.id, ip, userAgent: ua });

    return {
      ok: true,
      message: 'Account created. Check your email to verify before signing in.',
      agent: safeAgent(agent),
    };
  }

  // ── Email verification ────────────────────────────────────────────────────
  async verifyEmail(token: string) {
    const hashed = hashToken(token);
    const agent = await this.prisma.agentUser.findFirst({
      where: { emailVerifyToken: hashed },
    });
    if (!agent) throw new BadRequestException('Invalid verification token');
    if (agent.emailVerifyExpiry && agent.emailVerifyExpiry < new Date()) {
      throw new BadRequestException('Verification token expired — please request a new one');
    }
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: {
        emailVerified: true,
        active: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });
    await this.audit.log({ action: 'agent.email_verified', agentId: agent.id });
    return { ok: true, message: 'Email verified — you can now sign in.' };
  }

  async resendVerification(email: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { email } });
    // Always return success — don't reveal account existence
    if (!agent || agent.emailVerified) return { ok: true };

    const verifyRaw = generateToken(32);
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: {
        emailVerifyToken: hashToken(verifyRaw),
        emailVerifyExpiry: addHours(new Date(), EMAIL_VERIFY_HOURS),
      },
    });
    this.mail.sendEmailVerification(email, verifyRaw);
    await this.audit.log({ action: 'agent.verify_resent', agentId: agent.id });
    return { ok: true };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async login(email: string, password: string, ip?: string, ua?: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { email } });

    if (agent?.lockedUntil && agent.lockedUntil > new Date()) {
      await this.logHistory(agent.id, ip, ua, false, 'LOCKED');
      throw new UnauthorizedException('Account temporarily locked — try again later');
    }

    const valid = agent && (await bcrypt.compare(password, agent.passwordHash));

    if (!valid) {
      if (agent) {
        const attempts = agent.failedAttempts + 1;
        const lockUntil = attempts >= MAX_FAILED_ATTEMPTS ? addMinutes(new Date(), LOCKOUT_MINUTES) : null;
        await this.prisma.agentUser.update({
          where: { id: agent.id },
          data: { failedAttempts: attempts, lockedUntil: lockUntil },
        });
        await this.logHistory(agent.id, ip, ua, false, 'BAD_PASSWORD');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!agent.emailVerified) {
      await this.logHistory(agent.id, ip, ua, false, 'EMAIL_NOT_VERIFIED');
      throw new ForbiddenException('Please verify your email before signing in');
    }

    if (!agent.active || agent.status === 'SUSPENDED') {
      await this.logHistory(agent.id, ip, ua, false, 'ACCOUNT_INACTIVE');
      throw new ForbiddenException('Account is not active — contact support');
    }

    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await this.logHistory(agent.id, ip, ua, true);

    const tokens = await this.issueTokens(agent.id, agent.email, ip, ua);
    await this.audit.log({ action: 'agent.login.success', agentId: agent.id, ip, userAgent: ua });
    return { ...tokens, agent: safeAgent(agent) };
  }

  // ── Token issuance ───────────────────────────────────────────────────────
  private async issueTokens(agentId: string, email: string, ip?: string, ua?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: agentId, email, portal: 'agent' },
      { expiresIn: AGENT_AT_EXPIRES, secret: process.env.AGENT_JWT_SECRET || process.env.JWT_SECRET },
    );

    const rawRefresh = generateToken();
    await this.prisma.agentRefreshToken.create({
      data: {
        tokenHash: hashToken(rawRefresh),
        agentId,
        expiresAt: addDays(new Date(), AGENT_RT_DAYS),
        ip,
        userAgent: ua,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  // ── Refresh (rotate) ─────────────────────────────────────────────────────
  async refresh(rawToken: string, ip?: string, ua?: string) {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.agentRefreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.agentRefreshToken.updateMany({
          where: { agentId: stored.agentId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit.log({ action: 'agent.token.reuse_detected', agentId: stored.agentId, ip });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.agentRefreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } });

    const agent = await this.prisma.agentUser.findUnique({ where: { id: stored.agentId } });
    if (!agent || !agent.active) throw new UnauthorizedException('Account inactive');

    const tokens = await this.issueTokens(agent.id, agent.email, ip, ua);
    return { ...tokens, agent: safeAgent(agent) };
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async logout(rawToken: string, agentId: string) {
    const tokenHash = hashToken(rawToken);
    await this.prisma.agentRefreshToken.updateMany({
      where: { tokenHash, agentId },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'agent.logout', agentId });
    return { ok: true };
  }

  // ── Forgot / Reset password ──────────────────────────────────────────────
  async forgotPassword(email: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { email } });
    if (!agent || !agent.active) return { ok: true };

    const raw = generateToken(32);
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: { resetToken: hashToken(raw), resetTokenExpiry: addMinutes(new Date(), PASSWORD_RESET_MINUTES) },
    });
    this.mail.sendPasswordReset(email, raw, 'agent');
    await this.audit.log({ action: 'agent.password_reset.requested', agentId: agent.id });
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashed = hashToken(token);
    const agent = await this.prisma.agentUser.findFirst({ where: { resetToken: hashed } });
    if (!agent) throw new BadRequestException('Invalid or expired reset token');
    if (!agent.resetTokenExpiry || agent.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null, failedAttempts: 0, lockedUntil: null },
    });
    await this.prisma.agentRefreshToken.updateMany({
      where: { agentId: agent.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'agent.password_reset.completed', agentId: agent.id });
    return { ok: true };
  }

  async changePassword(agentId: string, dto: AgentChangePasswordDto) {
    const agent = await this.prisma.agentUser.findUnique({ where: { id: agentId } });
    if (!agent || !(await bcrypt.compare(dto.currentPassword, agent.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.agentUser.update({ where: { id: agentId }, data: { passwordHash } });
    await this.prisma.agentRefreshToken.updateMany({
      where: { agentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'agent.password_change', agentId });
    return { ok: true };
  }

  // ── Login history ────────────────────────────────────────────────────────
  private async logHistory(agentId: string, ip?: string, ua?: string, success = true, failReason?: string) {
    await this.prisma.agentLoginHistory.create({
      data: { agentId, ip, userAgent: ua, success, failReason },
    });
  }

  async getLoginHistory(agentId: string) {
    return this.prisma.agentLoginHistory.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
