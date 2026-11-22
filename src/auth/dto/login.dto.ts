import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  // Keep the existing API field for email clients; admin is a reserved sign-in alias.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @ValidateIf((dto: LoginDto) => dto.email !== 'admin')
  @IsEmail({}, { message: 'A valid email or admin username is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
