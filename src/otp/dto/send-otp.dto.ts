import { IsEmail, IsEnum } from 'class-validator';
import { OtpPurpose } from '../schemas/otp.schema';

export class SendOtpDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsEnum(OtpPurpose, { message: 'Invalid purpose' })
  purpose: OtpPurpose;
}
