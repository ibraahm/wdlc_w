import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentJwtPayload {
  sub: string;
  email: string;
  portal: 'agent';
}

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.AGENT_JWT_SECRET || process.env.JWT_SECRET || 'insecure-agent-secret',
    });
  }

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
