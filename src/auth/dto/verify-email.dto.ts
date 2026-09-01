import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'The verification code must be 6 digits' })
  otp: string;
}
