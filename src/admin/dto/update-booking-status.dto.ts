import { IsEnum } from 'class-validator';
import { BookingStatus } from '../../bookings/schemas/booking.schema';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus, { message: 'Invalid booking status' })
  status: BookingStatus;
}
