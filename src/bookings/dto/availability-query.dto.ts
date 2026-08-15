import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class AvailabilityQueryDto {
  @IsDateString({}, { message: 'A valid date (YYYY-MM-DD) is required' })
  date: string;

  @IsOptional()
  @IsMongoId({ message: 'A valid service id is required' })
  serviceId?: string;

  @IsOptional()
  @IsString()
  serviceIds?: string;
}
