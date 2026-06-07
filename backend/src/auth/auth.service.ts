import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, ChangePasswordDto } from './dto/auth.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  async login(email: string, password: string, ip?: string, ua?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({ action: 'auth.login', actorId: user.id, ip, userAgent: ua });

    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken: token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async createUser(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role ?? 'EDITOR',
      },
    });
    await this.audit.log({
      action: 'user.create',
      actorId,
      entity: 'User',
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.audit.log({ action: 'user.password_change', actorId: userId, entityId: userId });
    return { ok: true };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
