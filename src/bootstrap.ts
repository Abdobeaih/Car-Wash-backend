import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function configureApp(app: INestApplication): Promise<void> {
  const config = app.get(ConfigService);

  const origins = new Set<string>(
    (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );

  // Local development: accept the common localhost aliases so the app also
  // works when opened via http://127.0.0.1:3000 (browsers otherwise block
  // the request and fetch() reports "Failed to fetch").
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  app.enableCors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: unknown) => void) {
      // Development: allow any origin so the app works on http://localhost,
      // http://127.0.0.1 and LAN/network IPs without CORS blocking.
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
        return;
      }
      if (!origin || origins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  await configureApp(app);
  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
  Logger.log(`API running at http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Health check at http://localhost:${port}/health`, 'Bootstrap');
}
