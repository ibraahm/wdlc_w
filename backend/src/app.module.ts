import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { PortalAuthModule } from './portal-auth/portal-auth.module';
import { CmsModule } from './cms/cms.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Global rate limiting: 100 req / 60s per IP.
    // Tighter per-route limits applied with @Throttle() on sensitive endpoints.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
    ]),

    PrismaModule,
    CommonModule,
    AuditModule,
    AdminAuthModule,
    PortalAuthModule,
    CmsModule,
    AgentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Note: JWT guards are applied per-controller, not globally,
    // so each portal uses its own strategy with portal-scoped tokens.
  ],
})
export class AppModule {}
