import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
