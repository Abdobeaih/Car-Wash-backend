import { IsEmail, IsEnum, IsOptional, Matches } from 'class-validator';
import { OtpChannel, OtpPurpose } from '../schemas/otp.schema';

export class SendOtpDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsEnum(OtpPurpose, { message: 'Invalid purpose' })
  purpose: OtpPurpose;

  @IsOptional()
  @IsEnum(OtpChannel, { message: 'Invalid verification channel' })
  channel?: OtpChannel;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in international format, e.g. +14155552671',
  })
  phone?: string;
}
