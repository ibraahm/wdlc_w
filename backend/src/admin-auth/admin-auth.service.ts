import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { addDays, addMinutes } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { generateToken, hashToken } from '../common/crypto.util';
import {
  BCRYPT_ROUNDS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
  ADMIN_AT_EXPIRES,
  ADMIN_RT_DAYS,
  PASSWORD_RESET_MINUTES,
} from '../common/security.constants';
import {
  AdminCreateUserDto,
  AdminChangePasswordDto,
} from './dto/admin-auth.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private mail: MailService,
  ) {}

  // ── Login ────────────────────────────────────────────────────────────────
  async login(email: string, password: string, ip?: string, ua?: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });

    // Locked?
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log({ action: 'admin.login.locked', adminId: user.id, ip, userAgent: ua });
      throw new UnauthorizedException('Account temporarily locked — try again later');
    }

    const valid = user && user.active && (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
      if (user) {
        const attempts = user.failedAttempts + 1;
        const lockUntil = attempts >= MAX_FAILED_ATTEMPTS ? addMinutes(new Date(), LOCKOUT_MINUTES) : null;
        await this.prisma.adminUser.update({
          where: { id: user.id },
          data: { failedAttempts: attempts, lockedUntil: lockUntil },
        });
        await this.audit.log({ action: 'admin.login.failed', adminId: user.id, ip, userAgent: ua });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed counter on success
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role, ip, ua);
    await this.audit.log({ action: 'admin.login.success', adminId: user.id, ip, userAgent: ua });
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  // ── Token issuance ───────────────────────────────────────────────────────
  private async issueTokens(userId: string, email: string, role: string, ip?: string, ua?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, portal: 'admin' },
      { expiresIn: ADMIN_AT_EXPIRES, secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET },
    );

    const rawRefresh = generateToken();
    const tokenHash = hashToken(rawRefresh);
    await this.prisma.adminRefreshToken.create({
      data: {
        tokenHash,
        adminId: userId,
        expiresAt: addDays(new Date(), ADMIN_RT_DAYS),
        ip,
        userAgent: ua,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  // ── Refresh (rotate) ─────────────────────────────────────────────────────
  async refresh(rawToken: string, ip?: string, ua?: string) {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.adminRefreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Possible token reuse — revoke ALL tokens for this user (if we can find them)
      if (stored) {
        await this.prisma.adminRefreshToken.updateMany({
          where: { adminId: stored.adminId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit.log({ action: 'admin.token.reuse_detected', adminId: stored.adminId, ip });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke the used token (rotation)
    await this.prisma.adminRefreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.adminUser.findUnique({ where: { id: stored.adminId } });
    if (!user || !user.active) throw new UnauthorizedException('Account inactive');

    const tokens = await this.issueTokens(user.id, user.email, user.role, ip, ua);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  // ── Logout (revoke token) ────────────────────────────────────────────────
  async logout(rawToken: string, adminId: string) {
    const tokenHash = hashToken(rawToken);
    await this.prisma.adminRefreshToken.updateMany({
      where: { tokenHash, adminId },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'admin.logout', adminId });
    return { ok: true };
  }

  // ── Forgot / Reset password ──────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    // Always return success — don't reveal whether email exists
    if (!user || !user.active) return { ok: true };

    const raw = generateToken(32);
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { resetToken: hashToken(raw), resetTokenExpiry: addMinutes(new Date(), PASSWORD_RESET_MINUTES) } as any,
    });
    this.mail.sendPasswordReset(email, raw, 'admin');
    await this.audit.log({ action: 'admin.password_reset.requested', adminId: user.id });
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashed = hashToken(token);
    const user = await this.prisma.adminUser.findFirst({
      where: { resetToken: hashed } as any,
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const expiry = (user as any).resetTokenExpiry as Date | null;
    if (!expiry || expiry < new Date()) throw new BadRequestException('Reset token has expired');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null, failedAttempts: 0, lockedUntil: null } as any,
    });
    // Revoke all existing refresh tokens after password reset
    await this.prisma.adminRefreshToken.updateMany({
      where: { adminId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'admin.password_reset.completed', adminId: user.id });
    return { ok: true };
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
    await this.prisma.adminRefreshToken.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'admin.password_change', adminId });
    return { ok: true };
  }

  // ── User management (SUPER_ADMIN only) ───────────────────────────────────
  async createUser(dto: AdminCreateUserDto, actorId: string) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.adminUser.create({
      data: { email: dto.email, name: dto.name, passwordHash, role: dto.role ?? 'EDITOR' },
    });
    await this.audit.log({
      action: 'admin.user.create',
      adminId: actorId,
      entity: 'AdminUser',
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async listUsers() {
    return this.prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, failedAttempts: true, lockedUntil: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setUserActive(targetId: string, active: boolean, actorId: string) {
    if (targetId === actorId) throw new ForbiddenException('Cannot deactivate your own account');
    const user = await this.prisma.adminUser.update({ where: { id: targetId }, data: { active } });
    await this.audit.log({ action: active ? 'admin.user.activated' : 'admin.user.deactivated', adminId: actorId, entityId: targetId });
    return { id: user.id, active: user.active };
  }
}
