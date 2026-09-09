import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../../common/constants/roles';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  @IsOptional()
  confirmPassword?: string;

  // Matches the "Country" dropdown (e.g. "EG" or "Egypt")
  @IsOptional()
  @IsString()
  country?: string;

  // Matches the "Dial code" field, e.g. "+20"
  @IsOptional()
  @IsString()
  dialCode?: string;

  // Matches the "Phone number" field, e.g. "01142628174" — stored as-is, no verification.
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  role?: UserRole;
}