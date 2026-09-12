import { createConnection } from 'node:net';
import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { AddOnsModule } from './addons/addons.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { BookingsModule } from './bookings/bookings.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ContactModule } from './contact/contact.module';
import { SeedModule } from './seed/seed.module';
import { HealthModule } from './health/health.module';
import { OtpModule } from './otp/otp.module';

/**
 * Detects whether the URI targets a MongoDB on this local machine, so we can
 * safely probe it without relying on external network reachability.
 */
function isLocalMongoUri(uri: string): boolean {
  try {
    const host = new URL(uri.replace(/^mongodb\+srv/i, 'mongodb')).hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

/** Quick TCP probe to see if a MongoDB is actually listening. */
function isMongoListening(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(uri.replace(/^mongodb\+srv/i, 'mongodb'));
      const socket = createConnection({
        host: parsed.hostname,
        port: Number(parsed.port) || 27017,
      });
      const done = (ok: boolean) => {
        socket.destroy();
        resolve(ok);
      };
      socket.setTimeout(1500, () => done(false));
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
    } catch {
      resolve(false);
    }
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: [join(process.cwd(), '.env'), join(__dirname, '..', '.env')],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const uri = config.get<string>('DATABASE_URL');
        if (process.env.NODE_ENV === 'production' && !uri) {
          throw new Error(
            'DATABASE_URL is not set. Add it to your hosting environment (e.g. Vercel project env).',
          );
        }
        let dbUri = uri ?? 'mongodb://127.0.0.1:27017/mobile-car-care';

        // Local development only: if the configured MongoDB (127.0.0.1/localhost)
        // is not running, start an in-memory MongoDB so the API can be used
        // without installing MongoDB. Never applies to production or tests, and
        // never to remote/cloud databases.
        if (
          process.env.NODE_ENV !== 'production' &&
          process.env.NODE_ENV !== 'test' &&
          isLocalMongoUri(dbUri) &&
          !(await isMongoListening(dbUri))
        ) {
          Logger.log(
            `MongoDB at ${dbUri} is not reachable; starting an in-memory MongoDB for local development.`,
            'AppModule',
          );
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          const mongod = await MongoMemoryServer.create();
          dbUri = mongod.getUri('mobile-car-care');
          Logger.log(`Using in-memory MongoDB (${dbUri}).`, 'AppModule');
        }

        return {
          uri: dbUri,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          retryAttempts: 1,
          retryDelay: 1000,
          bufferCommands: false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    OtpModule,
    ServicesModule,
    AddOnsModule,
    VehiclesModule,
    BookingsModule,
    AdminModule,
    NotificationsModule,
    ContactModule,
    SeedModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
