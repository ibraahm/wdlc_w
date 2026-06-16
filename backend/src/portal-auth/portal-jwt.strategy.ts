import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JWT_ISSUER, JWT_AUDIENCE_AGENT } from '../common/security.constants';

export interface AgentJwtPayload {
  sub: string;
  email: string;
  portal: 'agent';
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
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE_AGENT,
    });
  }

  onModuleInit() {}

  async validate(payload: AgentJwtPayload) {
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
