import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  portal: 'admin';
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') implements OnModuleInit {
  constructor(private prisma: PrismaService) {
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('ADMIN_JWT_SECRET (or JWT_SECRET) env var is required');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  onModuleInit() {}

  async validate(payload: AdminJwtPayload) {
    // Reject tokens that were not issued for the admin portal
    if (payload.portal !== 'admin') {
      throw new UnauthorizedException('Invalid token portal');
    }
    const user = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Account inactive or not found');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }
    return { id: user.id, email: user.email, role: user.role, name: user.name, portal: 'admin' as const };
  }
}
