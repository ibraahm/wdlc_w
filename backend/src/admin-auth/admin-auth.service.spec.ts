import { Test } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-hash'),
}));
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../common/mail.service';
import { RefreshTokenService } from '../common/refresh-token.service';
import { MAX_FAILED_ATTEMPTS } from '../common/security.constants';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prisma: { adminUser: Record<string, jest.Mock>; adminRefreshToken: Record<string, jest.Mock> };
  let tokens: { rotate: jest.Mock; issue: jest.Mock; revoke: jest.Mock; revokeAll: jest.Mock };
  let audit: { log: jest.Mock };
  let mail: { sendPasswordReset: jest.Mock };

  const baseUser = {
    id: 'admin-1',
    email: 'admin@wdlc.test',
    name: 'Admin',
    role: 'SUPER_ADMIN',
    active: true,
    passwordHash: 'hash',
    failedAttempts: 0,
    lockedUntil: null,
  };

  beforeEach(async () => {
    process.env.ADMIN_JWT_SECRET = 'test-secret';
    prisma = {
      adminUser: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      adminRefreshToken: {},
    };
    tokens = {
      rotate: jest.fn(),
      issue: jest.fn().mockResolvedValue('raw-refresh'),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAll: jest.fn().mockResolvedValue(undefined),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    mail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('access-token') } },
        { provide: AuditService, useValue: audit },
        { provide: MailService, useValue: mail },
        { provide: RefreshTokenService, useValue: tokens },
      ],
    }).compile();

    service = moduleRef.get(AdminAuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('issues tokens and clears lockout on valid credentials', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('admin@wdlc.test', 'correct', '1.2.3.4', 'ua');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('raw-refresh');
      expect(result.user).toEqual({ id: 'admin-1', email: 'admin@wdlc.test', name: 'Admin', role: 'SUPER_ADMIN' });
      expect(prisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedAttempts: 0, lockedUntil: null }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.login.success' }));
    });

    it('rejects and increments failed attempts on a bad password', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('admin@wdlc.test', 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(prisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedAttempts: 1 }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.login.failed' }));
    });

    it('rejects with the same generic error for an unknown email (no enumeration)', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody@wdlc.test', 'pw')).rejects.toThrow('Invalid credentials');
      expect(prisma.adminUser.update).not.toHaveBeenCalled();
    });

    it('blocks login while the account is locked', async () => {
      prisma.adminUser.findUnique.mockResolvedValue({
        ...baseUser,
        lockedUntil: new Date(Date.now() + 600_000),
      });

      await expect(service.login('admin@wdlc.test', 'correct')).rejects.toThrow('temporarily locked');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.login.locked' }));
    });

    it('rejects an inactive account even with the right password', async () => {
      prisma.adminUser.findUnique.mockResolvedValue({ ...baseUser, active: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('admin@wdlc.test', 'correct')).rejects.toThrow(UnauthorizedException);
    });

    it('locks the account on the final failed attempt', async () => {
      prisma.adminUser.findUnique.mockResolvedValue({ ...baseUser, failedAttempts: MAX_FAILED_ATTEMPTS - 1 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('admin@wdlc.test', 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(prisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lockedUntil: expect.any(Date) }) }),
      );
    });
  });

  describe('refresh', () => {
    it('issues new tokens on a valid rotation', async () => {
      tokens.rotate.mockResolvedValue({ valid: true, reuseDetected: false, ownerId: 'admin-1' });
      prisma.adminUser.findUnique.mockResolvedValue(baseUser);

      const result = await service.refresh('raw');

      expect(result.accessToken).toBe('access-token');
      expect(tokens.issue).toHaveBeenCalled();
    });

    it('logs reuse and throws when rotation reports reuse', async () => {
      tokens.rotate.mockResolvedValue({ valid: false, reuseDetected: true, ownerId: 'admin-1' });

      await expect(service.refresh('raw', '1.2.3.4')).rejects.toThrow(UnauthorizedException);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.token.reuse_detected', adminId: 'admin-1' }),
      );
    });

    it('throws without a reuse log when the token is simply invalid', async () => {
      tokens.rotate.mockResolvedValue({ valid: false, reuseDetected: false });

      await expect(service.refresh('raw')).rejects.toThrow(UnauthorizedException);
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('rejects when the owner account is now inactive', async () => {
      tokens.rotate.mockResolvedValue({ valid: true, reuseDetected: false, ownerId: 'admin-1' });
      prisma.adminUser.findUnique.mockResolvedValue({ ...baseUser, active: false });

      await expect(service.refresh('raw')).rejects.toThrow('Account inactive');
    });
  });

  describe('resetPassword', () => {
    it('rejects an expired reset token', async () => {
      prisma.adminUser.findUnique.mockResolvedValue({ ...baseUser, resetTokenExpiry: new Date(Date.now() - 1000) });

      await expect(service.resetPassword('tok', 'newpassword1234')).rejects.toThrow(BadRequestException);
    });

    it('rotates the password and revokes all sessions on success', async () => {
      prisma.adminUser.findUnique.mockResolvedValue({ ...baseUser, resetTokenExpiry: new Date(Date.now() + 60_000) });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      await service.resetPassword('tok', 'newpassword1234');

      expect(tokens.revokeAll).toHaveBeenCalledWith(prisma.adminRefreshToken, 'adminId', 'admin-1');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'admin.password_reset.completed' }));
    });
  });

  describe('createUser', () => {
    it('rejects a duplicate email', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.createUser({ email: 'admin@wdlc.test', name: 'X', password: 'longpassword12', role: 'EDITOR' }, 'actor'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setUserActive', () => {
    it('refuses to deactivate your own account', async () => {
      await expect(service.setUserActive('admin-1', false, 'admin-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
