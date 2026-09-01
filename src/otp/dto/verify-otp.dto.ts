import { IsEmail, IsEnum, Matches } from 'class-validator';
import { OtpPurpose } from '../schemas/otp.schema';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsEnum(OtpPurpose, { message: 'Invalid purpose' })
  purpose: OtpPurpose;

  @Matches(/^\d{6}$/, { message: 'The verification code must be 6 digits' })
  otp: string;
}
