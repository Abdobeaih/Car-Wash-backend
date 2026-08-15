import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { IsImageUrl } from './is-image-url.validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  description: string;

  @IsImageUrl({ message: 'A valid image URL is required' })
  image: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  basePrice: number;

  @IsNumber()
  @Min(15, { message: 'Duration must be at least 15 minutes' })
  duration: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateServiceDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @IsImageUrl()
  @IsOptional()
  image?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @Min(15)
  @IsOptional()
  duration?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
