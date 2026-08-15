import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(2, { message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsString()
  @MinLength(5, { message: 'Message must be at least 5 characters' })
  message: string;
}
