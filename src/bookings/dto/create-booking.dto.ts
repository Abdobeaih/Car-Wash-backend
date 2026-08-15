import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsValidDateString } from '../validators/is-valid-date-string.validator';
import { IsValidTimeString } from '../validators/is-valid-time-string.validator';

class LocationDto {
  @IsString()
  @MinLength(2, { message: 'Country is required' })
  country: string;

  @IsString()
  @MinLength(2, { message: 'City is required' })
  city: string;

  @IsString()
  @MinLength(5, { message: 'Address is required' })
  address: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

class ServiceSelectionDto {
  @IsMongoId({ message: 'A valid service is required' })
  serviceId: string;

  @IsArray()
  @ArrayUnique({ message: 'Add-ons must be unique' })
  @IsMongoId({ each: true, message: 'Invalid add-on id' })
  addOnIds: string[];
}

export class CreateBookingDto {
  @IsMongoId({ message: 'A valid vehicle is required' })
  vehicleId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSelectionDto)
  services: ServiceSelectionDto[];

  @IsValidDateString()
  date: string;

  @IsValidTimeString()
  startTime: string;

  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
