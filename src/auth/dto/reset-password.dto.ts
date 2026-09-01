import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'The verification code must be 6 digits' })
  otp: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
