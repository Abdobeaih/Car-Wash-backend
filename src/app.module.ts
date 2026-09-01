import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: [join(process.cwd(), '.env'), join(__dirname, '..', '.env')],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('DATABASE_URL');
        if (process.env.NODE_ENV === 'production' && !uri) {
          throw new Error(
            'DATABASE_URL is not set. Add it to your hosting environment (e.g. Vercel project env).',
          );
        }
        return {
          uri: uri ?? 'mongodb://127.0.0.1:27017/mobile-car-care',
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
})
export class AppModule {}
