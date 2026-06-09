import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentJwtPayload {
  sub: string;
  email: string;
  portal: 'agent' | 'admin';
  role?: string;
}

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') implements OnModuleInit {
  constructor(private prisma: PrismaService) {
    const secret = process.env.AGENT_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('AGENT_JWT_SECRET (or JWT_SECRET) env var is required');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  onModuleInit() {}

  async validate(payload: AgentJwtPayload) {
    if (payload.portal === 'admin') {
      const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
      if (!admin || !admin.active) {
        throw new UnauthorizedException('Admin account not found or inactive');
      }
      if (admin.lockedUntil && admin.lockedUntil > new Date()) {
        throw new UnauthorizedException('Account temporarily locked');
      }
      return {
        id: admin.id,
        email: admin.email,
        firstName: admin.name,
        lastName: '',
        role: admin.role,
        portal: 'admin' as const,
      };
    }

    if (payload.portal !== 'agent') {
      throw new UnauthorizedException('Invalid token portal');
    }
    const agent = await this.prisma.agentUser.findUnique({ where: { id: payload.sub } });
    if (!agent || !agent.active || !agent.emailVerified) {
      throw new UnauthorizedException('Account not found, inactive, or email not verified');
    }
    if (agent.lockedUntil && agent.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }
    return {
      id: agent.id,
      email: agent.email,
      firstName: agent.firstName,
      lastName: agent.lastName,
      status: agent.status,
      portal: 'agent' as const,
    };
  }
}
