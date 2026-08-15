import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { CarService, ServiceSchema } from '../services/schemas/service.schema';
import { AddOn, AddOnSchema } from '../addons/schemas/addon.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: CarService.name, schema: ServiceSchema },
      { name: AddOn.name, schema: AddOnSchema },
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, AvailabilityService],
  exports: [BookingsService, AvailabilityService],
})
export class BookingsModule {}
