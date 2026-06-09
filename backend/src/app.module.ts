import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { envValidationSchema } from './config/env.validation';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { PortalAuthModule } from './portal-auth/portal-auth.module';
import { CmsModule } from './cms/cms.module';
import { AgentsModule } from './agents/agents.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    // Structured JSON logging in prod; pretty-printed in dev. Redacts secrets
    // and PII so tokens/passwords never reach the logs.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.newPassword',
            'req.body.currentPassword',
            'req.body.refreshToken',
            'req.body.recaptchaToken',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
        // Avoid logging full request bodies by default; keep the access log lean.
        autoLogging: true,
      },
    }),

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
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Note: JWT guards are applied per-controller, not globally,
    // so each portal uses its own strategy with portal-scoped tokens.
  ],
})
export class AppModule {}
