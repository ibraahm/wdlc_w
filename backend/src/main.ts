import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

function assertSecrets() {
  const isProd = process.env.NODE_ENV === 'production';
  const placeholders = new Set(['change-me-to-a-long-random-string', 'change-me-admin-secret-openssl-rand-hex-32', 'change-me-agent-secret-openssl-rand-hex-32', '']);
  const adminSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  const agentSecret = process.env.AGENT_JWT_SECRET || process.env.JWT_SECRET;
  if (!adminSecret || !agentSecret) {
    throw new Error('ADMIN_JWT_SECRET and AGENT_JWT_SECRET (or JWT_SECRET) must be set');
  }
  if (isProd && (placeholders.has(adminSecret) || placeholders.has(agentSecret))) {
    throw new Error('Placeholder JWT secrets detected in production - set real values via environment variables');
  }
}

async function bootstrap() {
  assertSecrets();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Route Nest's logger through pino (structured, redacted).
  app.useLogger(app.get(Logger));

  // Behind a reverse proxy (nginx in prod, the Next web/portal/admin route
  // handlers locally), trust X-Forwarded-* so req.ip / req.headers reflect the
  // real client — correct rate limiting, lockout, and audit/e-signature IPs.
  //   - production: trust 1 hop (the front proxy) by default
  //   - dev/staging: trust the loopback proxy, so the same-host Next routes can
  //     forward the real client IP/UA
  //   - override with TRUST_PROXY (a hop count, or an Express trust-proxy value
  //     like "loopback, 10.0.0.0/8") for multi-hop deployments.
  const rawTrust = process.env.TRUST_PROXY;
  const trustProxy = rawTrust
    ? (/^\d+$/.test(rawTrust.trim()) ? Number(rawTrust.trim()) : rawTrust)
    : process.env.NODE_ENV === 'production' ? 1 : 'loopback';
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);

  // Drain in-flight work and run onModuleDestroy (Prisma $disconnect) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // Security headers
  app.use(helmet());

  // Strict input validation - strips unknown props, blocks extras
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = parseInt(process.env.PORT || '4000', 10);
  // Bind to loopback only - the API must never be reachable from the public
  // internet. The Next apps and nginx reach it on 127.0.0.1. Override with
  // BIND_HOST=0.0.0.0 only if you intentionally expose it (not recommended).
  const host = process.env.BIND_HOST || '127.0.0.1';
  await app.listen(port, host);
  app.get(Logger).log(`World Direct Link backend listening on http://${host}:${port}/api`);

  // Startup route validation: log how many routes registered and, specifically,
  // the nav routes. This proves whether THIS running build actually serves
  // /api/cms/nav/admin (vs. a stale dist / old pm2 process answering).
  try {
    const instance = app.getHttpAdapter().getInstance();
    const stack = (instance?._router?.stack ?? []) as Array<{
      route?: { path: string; methods: Record<string, boolean> };
    }>;
    const routes: string[] = [];
    for (const layer of stack) {
      if (layer.route?.path) {
        const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase()).join(',');
        routes.push(`${methods} ${layer.route.path}`);
      }
    }
    const navRoutes = routes.filter((r) => r.includes('/nav'));
    app.get(Logger).log(`[routes] total=${routes.length} nav=[${navRoutes.join(' | ') || 'NONE'}]`);
  } catch (e) {
    app.get(Logger).warn(`[routes] route dump failed: ${(e as Error).message}`);
  }
}
void bootstrap();
