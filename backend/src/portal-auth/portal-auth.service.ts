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
import { addHours, addMinutes } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { RefreshTokenService } from '../common/refresh-token.service';
import { generateToken, hashToken } from '../common/crypto.util';
import { verifyPassword } from '../common/password.util';
import { isLocked, nextFailedAttempt, CLEAR_LOCKOUT } from '../common/lockout.util';
import {
  BCRYPT_ROUNDS,
  AGENT_AT_EXPIRES,
  AGENT_RT_DAYS,
  EMAIL_VERIFY_HOURS,
  PASSWORD_RESET_MINUTES,
  JWT_ISSUER,
  JWT_AUDIENCE_AGENT,
} from '../common/security.constants';
import { AgentSignupDto, AgentChangePasswordDto } from './dto/portal-auth.dto';

const OWNER_KEY = 'agentId';
const agentSecret = () => process.env.AGENT_JWT_SECRET || process.env.JWT_SECRET;
const googleClientId = () => process.env.GOOGLE_CLIENT_ID || '';
const safeAgent = (a: any) => ({
  id: a.id,
  email: a.email,
  firstName: a.firstName,
  lastName: a.lastName,
  phone: a.phone,
  status: a.status,
  emailVerified: a.emailVerified,
  mustChangePassword: a.mustChangePassword ?? false,
});

@Injectable()
export class PortalAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private mail: MailService,
    private tokens: RefreshTokenService,
  ) {}

  private get rtDelegate() {
    return this.prisma.agentRefreshToken;
  }

  // ── Signup ──────────────────────────────────────────────────────────────────
  async signup(dto: AgentSignupDto, ip?: string, ua?: string) {
    const existing = await this.prisma.agentUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const verifyRaw = generateToken(32);

    const agent = await this.prisma.agentUser.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        emailVerifyToken: hashToken(verifyRaw),
        emailVerifyExpiry: addHours(new Date(), EMAIL_VERIFY_HOURS),
        active: false,
        emailVerified: false,
        status: 'PENDING',
      },
    });

    void this.mail.sendEmailVerification(dto.email, verifyRaw);
    await this.audit.log({ action: 'agent.signup', agentId: agent.id, ip, userAgent: ua });
    return {
      ok: true,
      message: 'Account created. Check your email to verify before signing in.',
      agent: safeAgent(agent),
    };
  }

  // ── Email verification ────────────────────────────────────────────────────────
  async verifyEmail(token: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { emailVerifyToken: hashToken(token) } });
    if (!agent) throw new BadRequestException('Invalid verification token');
    if (agent.emailVerifyExpiry && agent.emailVerifyExpiry < new Date()) {
      throw new BadRequestException('Verification token expired - please request a new one');
    }
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: { emailVerified: true, active: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });
    await this.audit.log({ action: 'agent.email_verified', agentId: agent.id });
    return { ok: true, message: 'Email verified - you can now sign in.' };
  }

  async resendVerification(email: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { email } });
    if (!agent || agent.emailVerified) return { ok: true }; // don't reveal account existence

    const verifyRaw = generateToken(32);
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: { emailVerifyToken: hashToken(verifyRaw), emailVerifyExpiry: addHours(new Date(), EMAIL_VERIFY_HOURS) },
    });
    void this.mail.sendEmailVerification(email, verifyRaw);
    await this.audit.log({ action: 'agent.verify_resent', agentId: agent.id });
    return { ok: true };
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string, ip?: string, ua?: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { email } });

    // Always verify the password (dummy compare when the account is missing) so
    // neither the response nor its timing reveals whether the email exists.
    const passwordValid = await verifyPassword(password, agent?.passwordHash);

    if (!agent || !passwordValid) {
      if (agent) {
        await this.prisma.agentUser.update({ where: { id: agent.id }, data: nextFailedAttempt(agent.failedAttempts) });
        await this.logHistory(agent.id, ip, ua, false, 'BAD_PASSWORD');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Credentials are correct - the account-state messages below require the
    // right password to reach, so they cannot be used for enumeration.
    if (isLocked(agent.lockedUntil)) {
      await this.logHistory(agent.id, ip, ua, false, 'LOCKED');
      throw new UnauthorizedException('Account temporarily locked - try again later');
    }

    if (!agent.emailVerified) {
      await this.logHistory(agent.id, ip, ua, false, 'EMAIL_NOT_VERIFIED');
      throw new ForbiddenException('Please verify your email before signing in');
    }
    if (!agent.active || agent.status === 'SUSPENDED') {
      await this.logHistory(agent.id, ip, ua, false, 'ACCOUNT_INACTIVE');
      throw new ForbiddenException('Account is not active - contact support');
    }

    await this.prisma.agentUser.update({ where: { id: agent.id }, data: { ...CLEAR_LOCKOUT, lastLoginAt: new Date() } });
    await this.logHistory(agent.id, ip, ua, true);
    await this.audit.log({ action: 'agent.login.success', agentId: agent.id, ip, userAgent: ua });
    return { ...(await this.issueTokens(agent, ip, ua)), agent: safeAgent(agent) };
  }

  // ── Google sign-in ───────────────────────────────────────────────────────────
  // Google is used only as an *identity proof* for accounts that already exist
  // and are approved. It never creates accounts and never bypasses the agent
  // lifecycle - a money-transmitter portal cannot let arbitrary Google users in.
  // Disabled entirely unless GOOGLE_CLIENT_ID is configured.
  async loginWithGoogle(credential: string, ip?: string, ua?: string) {
    const clientId = googleClientId();
    if (!clientId) throw new BadRequestException('Google sign-in is not enabled');
    if (!credential) throw new BadRequestException('Missing Google credential');

    // Verify the ID token's signature, audience, issuer and expiry with Google.
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

    if (!email || !emailVerified) {
      throw new UnauthorizedException('Your Google email is not verified');
    }

    const agent = await this.prisma.agentUser.findUnique({ where: { email } });
    if (!agent) {
      await this.audit.log({ action: 'agent.login.google.no_account', entity: 'AgentUser', after: { email }, ip, userAgent: ua });
      throw new ForbiddenException('No portal account is linked to this Google email. Contact World Direct Link.');
    }

    if (isLocked(agent.lockedUntil)) {
      await this.logHistory(agent.id, ip, ua, false, 'LOCKED');
      throw new UnauthorizedException('Account temporarily locked - try again later');
    }
    if (!agent.active || agent.status === 'SUSPENDED') {
      await this.logHistory(agent.id, ip, ua, false, 'ACCOUNT_INACTIVE');
      throw new ForbiddenException('Account is not active - contact support');
    }

    // Google has proven mailbox control, so mark the email verified, clear any
    // lockout, and record the login - mirroring a successful password login.
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: { ...CLEAR_LOCKOUT, emailVerified: true, lastLoginAt: new Date() },
    });
    await this.logHistory(agent.id, ip, ua, true);
    await this.audit.log({ action: 'agent.login.google.success', agentId: agent.id, ip, userAgent: ua });
    return { ...(await this.issueTokens(agent, ip, ua)), agent: safeAgent({ ...agent, emailVerified: true }) };
  }

  // ── Token issuance ──────────────────────────────────────────────────────────
  private async issueTokens(agent: { id: string; email: string }, ip?: string, ua?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: agent.id, email: agent.email, portal: 'agent' },
      { expiresIn: AGENT_AT_EXPIRES, secret: agentSecret(), issuer: JWT_ISSUER, audience: JWT_AUDIENCE_AGENT },
    );
    const refreshToken = await this.tokens.issue(this.rtDelegate, OWNER_KEY, agent.id, AGENT_RT_DAYS, ip, ua);
    return { accessToken, refreshToken };
  }

  // ── Refresh (rotate) ────────────────────────────────────────────────────────
  async refresh(rawToken: string, ip?: string, ua?: string) {
    const outcome = await this.tokens.rotate(this.rtDelegate, OWNER_KEY, rawToken);
    if (!outcome.valid) {
      if (outcome.reuseDetected) {
        await this.audit.log({ action: 'agent.token.reuse_detected', agentId: outcome.ownerId, ip });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const agent = await this.prisma.agentUser.findUnique({ where: { id: outcome.ownerId! } });
    if (!agent || !agent.active) throw new UnauthorizedException('Account inactive');
    return { ...(await this.issueTokens(agent, ip, ua)), agent: safeAgent(agent) };
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async logout(rawToken: string, agentId: string) {
    await this.tokens.revoke(this.rtDelegate, OWNER_KEY, rawToken, agentId);
    await this.audit.log({ action: 'agent.logout', agentId });
    return { ok: true };
  }

  // ── Forgot / Reset password ──────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { email } });
    if (!agent || !agent.active) return { ok: true };

    const raw = generateToken(32);
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      data: { resetToken: hashToken(raw), resetTokenExpiry: addMinutes(new Date(), PASSWORD_RESET_MINUTES) },
    });
    void this.mail.sendPasswordReset(email, raw, 'agent');
    await this.audit.log({ action: 'agent.password_reset.requested', agentId: agent.id });
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { resetToken: hashToken(token) } });
    if (!agent || !agent.resetTokenExpiry || agent.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.agentUser.update({
      where: { id: agent.id },
      // Completing the emailed setup/reset link proves mailbox control, so the
      // account is verified and activated - the agent can sign in immediately.
      data: {
        passwordHash,
        emailVerified: true,
        active: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
        resetToken: null,
        resetTokenExpiry: null,
        ...CLEAR_LOCKOUT,
      },
    });
    await this.tokens.revokeAll(this.rtDelegate, OWNER_KEY, agent.id);
    await this.audit.log({ action: 'agent.password_reset.completed', agentId: agent.id });
    return { ok: true };
  }

  async changePassword(agentId: string, dto: AgentChangePasswordDto, ip?: string, ua?: string) {
    const agent = await this.prisma.agentUser.findUnique({ where: { id: agentId } });
    if (!agent || !(await bcrypt.compare(dto.currentPassword, agent.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    const updated = await this.prisma.agentUser.update({
      where: { id: agentId },
      data: { passwordHash, mustChangePassword: false },
    });
    // Revoke existing sessions, then mint a fresh pair so the caller stays
    // signed in with a token that no longer carries the forced-change flag.
    await this.tokens.revokeAll(this.rtDelegate, OWNER_KEY, agentId);
    await this.audit.log({ action: 'agent.password_change', agentId });
    const tokens = await this.issueTokens(updated, ip, ua);
    return { ok: true, ...tokens, agent: safeAgent(updated) };
  }

  // ── Login history ─────────────────────────────────────────────────────────────
  private logHistory(agentId: string, ip?: string, ua?: string, success = true, failReason?: string) {
    return this.prisma.agentLoginHistory.create({ data: { agentId, ip, userAgent: ua, success, failReason } });
  }

  getLoginHistory(agentId: string) {
    return this.prisma.agentLoginHistory.findMany({ where: { agentId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
}
