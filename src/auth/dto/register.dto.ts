import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

import { UserRole } from '../../common/constants/roles';
import { OtpChannel } from '../../otp/schemas/otp.schema';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  'name': string;

  @IsEmail({}, { message: 'A valid email is required' })
  'email': string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  'password': string;

  @IsString()
  @IsOptional()
  confirmPassword?: string;

  @IsOptional()
  @Matches(/^[A-Za-z ]{2,}$/, {
    message: 'Country must be a valid country name or 2-letter code',
  })
  country?: string;

  @IsOptional()
  @Matches(/^\+?\d{1,4}$/, {
    message: 'Dial code must be an international dial code, e.g. +20 or 1',
  })
  dialCode?: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{4,14}$/, {
    message: 'Phone must be a valid international or national number',
  })
  phone?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Country code must be 2 letters, e.g. US',
  })
  countryCode?: string;

  @IsOptional()
  @IsEnum(OtpChannel, {
    message: 'Invalid verification channel, use EMAIL or SMS',
  })
  verificationChannel?: OtpChannel;

  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Invalid role',
  })
  role?: UserRole;
}