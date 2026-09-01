import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../../common/constants/roles';
import { OtpChannel } from '../../otp/schemas/otp.schema';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in international format, e.g. +14155552671',
  })
  phone?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'Country code must be 2 letters, e.g. US' })
  countryCode?: string;

  @IsOptional()
  @IsEnum(OtpChannel, { message: 'Invalid verification channel, use EMAIL or SMS' })
  verificationChannel?: OtpChannel;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  role?: UserRole;
}
