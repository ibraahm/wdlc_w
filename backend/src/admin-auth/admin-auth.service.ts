import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { addMinutes, addHours } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { RefreshTokenService } from '../common/refresh-token.service';
import { generateToken, hashToken } from '../common/crypto.util';
import { verifyPassword } from '../common/password.util';
import { isLocked, nextFailedAttempt, CLEAR_LOCKOUT } from '../common/lockout.util';
import {
  BCRYPT_ROUNDS,
  ADMIN_AT_EXPIRES,
  ADMIN_RT_DAYS,
  PASSWORD_RESET_MINUTES,
  JWT_ISSUER,
  JWT_AUDIENCE_ADMIN,
} from '../common/security.constants';
import { AdminCreateUserDto } from './dto/admin-auth.dto';

const OWNER_KEY = 'adminId';
const adminSecret = () => process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const googleClientId = () => process.env.ADMIN_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const publicUser = (u: { id: string; email: string; name: string; role: string; mustChangePassword?: boolean; regionalOfficeId?: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  mustChangePassword: !!u.mustChangePassword,
  regionalOfficeId: u.regionalOfficeId ?? null,
});

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private mail: MailService,
    private tokens: RefreshTokenService,
  ) {}

  private get rtDelegate() {
    return this.prisma.adminRefreshToken;
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string, ip?: string, ua?: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });

    // Always verify the password (dummy compare when the account is missing) so
    // neither the response nor its timing reveals whether the email exists.
    const passwordValid = await verifyPassword(password, user?.passwordHash);

    if (!user || !passwordValid) {
      if (user) {
        await this.prisma.adminUser.update({ where: { id: user.id }, data: nextFailedAttempt(user.failedAttempts) });
        await this.audit.log({ action: 'admin.login.failed', adminId: user.id, ip, userAgent: ua });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Credentials are correct - account-state messages below cannot be used for
    // enumeration since they require the right password to reach.
    if (isLocked(user.lockedUntil)) {
      await this.audit.log({ action: 'admin.login.locked', adminId: user.id, ip, userAgent: ua });
      throw new UnauthorizedException('Account temporarily locked - try again later');
    }
    if (!user.active) {
      await this.audit.log({ action: 'admin.login.inactive', adminId: user.id, ip, userAgent: ua });
      throw new UnauthorizedException('Account is not active - contact support');
    }

    await this.prisma.adminUser.update({ where: { id: user.id }, data: { ...CLEAR_LOCKOUT, lastLoginAt: new Date() } });
    await this.audit.log({ action: 'admin.login.success', adminId: user.id, ip, userAgent: ua });
    return { ...(await this.issueTokens(user, ip, ua)), user: publicUser(user) };
  }

  // ── Google sign-in ───────────────────────────────────────────────────────────
  // Identity proof only: authenticates an existing, active admin by verified
  // email. Never creates accounts. Disabled unless a Google client id is set.
  async loginWithGoogle(credential: string, ip?: string, ua?: string) {
    const clientId = googleClientId();
    if (!clientId) throw new BadRequestException('Google sign-in is not enabled');
    if (!credential) throw new BadRequestException('Missing Google credential');

    let email: string | undefined;
    let emailVerified = false;
    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      const payload = ticket.getPayload();
      email = payload?.email?.toLowerCase();
      emailVerified = payload?.email_verified === true;
    } catch {
      throw new UnauthorizedException('Could not verify Google sign-in');
    }
    if (!email || !emailVerified) throw new UnauthorizedException('Your Google email is not verified');

    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      await this.audit.log({ action: 'admin.login.google.no_account', after: { email }, ip, userAgent: ua });
      throw new ForbiddenException('No admin account is linked to this Google email.');
    }
    if (isLocked(user.lockedUntil)) throw new UnauthorizedException('Account temporarily locked - try again later');
    if (!user.active) throw new UnauthorizedException('Account is not active - contact support');

    await this.prisma.adminUser.update({ where: { id: user.id }, data: { ...CLEAR_LOCKOUT, lastLoginAt: new Date() } });
    await this.audit.log({ action: 'admin.login.google.success', adminId: user.id, ip, userAgent: ua });
    return { ...(await this.issueTokens(user, ip, ua)), user: publicUser(user) };
  }

  // ── Token issuance ──────────────────────────────────────────────────────────
  private async issueTokens(user: { id: string; email: string; role: string }, ip?: string, ua?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, portal: 'admin' },
      { expiresIn: ADMIN_AT_EXPIRES, secret: adminSecret(), issuer: JWT_ISSUER, audience: JWT_AUDIENCE_ADMIN },
    );
    const refreshToken = await this.tokens.issue(this.rtDelegate, OWNER_KEY, user.id, ADMIN_RT_DAYS, ip, ua);
    return { accessToken, refreshToken };
  }

  // ── Refresh (rotate) ────────────────────────────────────────────────────────
  async refresh(rawToken: string, ip?: string, ua?: string) {
    const outcome = await this.tokens.rotate(this.rtDelegate, OWNER_KEY, rawToken);
    if (!outcome.valid) {
      if (outcome.reuseDetected) {
        await this.audit.log({ action: 'admin.token.reuse_detected', adminId: outcome.ownerId, ip });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.adminUser.findUnique({ where: { id: outcome.ownerId! } });
    if (!user || !user.active) throw new UnauthorizedException('Account inactive');
    return { ...(await this.issueTokens(user, ip, ua)), user: publicUser(user) };
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async logout(rawToken: string, adminId: string) {
    await this.tokens.revoke(this.rtDelegate, OWNER_KEY, rawToken, adminId);
    await this.audit.log({ action: 'admin.logout', adminId });
    return { ok: true };
  }

  // ── Forgot / Reset password ──────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user || !user.active) return { ok: true }; // don't reveal account existence

    const raw = generateToken(32);
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { resetToken: hashToken(raw), resetTokenExpiry: addMinutes(new Date(), PASSWORD_RESET_MINUTES) },
    });
    void this.mail.sendPasswordReset(email, raw, 'admin');
    await this.audit.log({ action: 'admin.password_reset.requested', adminId: user.id });
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { resetToken: hashToken(token) } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null, ...CLEAR_LOCKOUT },
    });
    await this.tokens.revokeAll(this.rtDelegate, OWNER_KEY, user.id);
    await this.audit.log({ action: 'admin.password_reset.completed', adminId: user.id });
    return { ok: true };
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash, mustChangePassword: false } });
    await this.tokens.revokeAll(this.rtDelegate, OWNER_KEY, adminId);
    await this.audit.log({ action: 'admin.password_change', adminId });
    return { ok: true };
  }

  // ── User management (SUPER_ADMIN only) ────────────────────────────────────────
  async createUser(dto: AdminCreateUserDto, actorId: string) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // A regional officer must be tied to an office; ignore the office for other roles.
    const regionalOfficeId = dto.role === 'REGIONAL_OFFICER' ? (dto.regionalOfficeId ?? null) : null;
    const accessExpiresAt = (dto as any).accessExpiresAt ? new Date((dto as any).accessExpiresAt) : null;
    const user = await this.prisma.adminUser.create({
      // Password was set by another admin - require the user to change it on first login.
      data: { email: dto.email, name: dto.name, passwordHash, role: dto.role ?? 'EDITOR', regionalOfficeId, accessExpiresAt, mustChangePassword: true },
    });
    await this.audit.log({
      action: 'admin.user.create',
      adminId: actorId,
      entity: 'AdminUser',
      entityId: user.id,
      after: { email: user.email, role: user.role, regionalOfficeId, accessExpiresAt },
    });
    return publicUser(user);
  }

  // Invite: create the account with no usable password and email a one-time
  // link so the user sets their own password (they can also use Google sign-in).
  async inviteUser(dto: { email: string; name: string; role?: string; regionalOfficeId?: string; accessExpiresAt?: string }, actorId: string) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(generateToken(32), BCRYPT_ROUNDS); // unusable until set
    const raw = generateToken(32);
    const regionalOfficeId = dto.role === 'REGIONAL_OFFICER' ? (dto.regionalOfficeId ?? null) : null;
    const accessExpiresAt = dto.accessExpiresAt ? new Date(dto.accessExpiresAt) : null;
    const user = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role ?? 'EDITOR',
        regionalOfficeId,
        accessExpiresAt,
        mustChangePassword: false,
        resetToken: hashToken(raw),
        resetTokenExpiry: addHours(new Date(), 48),
      },
    });
    void this.mail.sendAdminInvite(dto.email, raw, dto.name);
    await this.audit.log({ action: 'admin.user.invite', adminId: actorId, entity: 'AdminUser', entityId: user.id, after: { email: user.email, role: user.role, accessExpiresAt } });
    return publicUser(user);
  }

  async listUsers() {
    return this.prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, regionalOfficeId: true, lastLoginAt: true, failedAttempts: true, lockedUntil: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Assign / move a user's regional office (and ensure role alignment).
  async setUserRegion(targetId: string, regionalOfficeId: string | null, actorId: string) {
    const user = await this.prisma.adminUser.update({ where: { id: targetId }, data: { regionalOfficeId } });
    await this.audit.log({ action: 'admin.user.region.set', adminId: actorId, entityId: targetId, after: { regionalOfficeId } });
    return { id: user.id, regionalOfficeId: user.regionalOfficeId };
  }

  async setUserActive(targetId: string, active: boolean, actorId: string) {
    if (targetId === actorId) throw new ForbiddenException('Cannot deactivate your own account');
    const user = await this.prisma.adminUser.update({ where: { id: targetId }, data: { active } });
    await this.audit.log({ action: active ? 'admin.user.activated' : 'admin.user.deactivated', adminId: actorId, entityId: targetId });
    return { id: user.id, active: user.active };
  }
}
