import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'A valid email is required' })
  email?: string;

  @IsOptional()
  @Matches(/^\+?\d{4,15}$/, {
    message: 'Phone must be a valid international or national number',
  })
  phone?: string;
}
