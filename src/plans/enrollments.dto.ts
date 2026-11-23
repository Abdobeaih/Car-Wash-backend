import {
  IsMongoId,
  IsString,
  IsIn,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
  IsDefined,
  IsBoolean,
  Equals,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
export class ActivateEnrollmentDto {
  @IsMongoId() customerId: string;
  @IsMongoId() vehicleId: string;
  @IsIn(['monthlyExterior', 'interiorExterior']) planCode: 'monthlyExterior' | 'interiorExterior';
  @IsString() @MinLength(8) @MaxLength(100) activationKey: string;
  @IsBoolean() @Equals(true) paymentReceived: true;
  @IsOptional() @IsString() @MaxLength(200) paymentReference?: string;
}
export class RedeemVisitDto {
  @IsString() @MinLength(8) @MaxLength(100) requestKey: string;
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateBookingDto)
  booking: CreateBookingDto;
}
