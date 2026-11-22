import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema, OtpQuota, OtpQuotaSchema } from './schemas/otp.schema';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: OtpQuota.name, schema: OtpQuotaSchema },
    ]),
  ],
  controllers: [OtpController],
  providers: [OtpService, MailService, SmsService],
  exports: [OtpService],
})
export class OtpModule {}
