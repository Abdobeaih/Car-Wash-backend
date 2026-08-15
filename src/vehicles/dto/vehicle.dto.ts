import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { VehicleType } from '../schemas/vehicle.schema';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1, { message: 'Brand is required' })
  brand: string;

  @IsString()
  @MinLength(1, { message: 'Model is required' })
  model: string;

  @IsInt()
  @Min(1980, { message: 'Year must be 1980 or later' })
  @Max(2100, { message: 'Year must be 2100 or earlier' })
  year: number;

  @IsString()
  @MinLength(1, { message: 'Color is required' })
  color: string;

  @IsString()
  @MinLength(2, { message: 'Plate number is required' })
  plateNumber: string;

  @IsEnum(VehicleType, { message: 'Invalid vehicle type' })
  vehicleType: VehicleType;
}

export class UpdateVehicleDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  brand?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  model?: string;

  @IsInt()
  @Min(1980)
  @Max(2100)
  @IsOptional()
  year?: number;

  @IsString()
  @MinLength(1)
  @IsOptional()
  color?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  plateNumber?: string;

  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;
}
