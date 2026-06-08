import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
    throw new Error('Placeholder JWT secrets detected in production — set real values via environment variables');
  }
}

async function bootstrap() {
  assertSecrets();
  const app = await NestFactory.create(AppModule);

  // Behind a load balancer / reverse proxy in production: trust X-Forwarded-*
  // so req.ip is the real client (correct rate limiting, lockout, audit IPs).
  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // Drain in-flight work and run onModuleDestroy (Prisma $disconnect) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // Security headers
  app.use(helmet());

  // Strict input validation — strips unknown props, blocks extras
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
  await app.listen(port);
  console.log(`WDLC backend listening on http://localhost:${port}/api`);
}
bootstrap();
