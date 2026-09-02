import { IsEmail, IsOptional, Matches } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in international format, e.g. +14155552671',
  })
  phone?: string;
}
