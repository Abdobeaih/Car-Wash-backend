import { User, UserSchema } from '../users/schemas/user.schema';
import { PlanRemindersController } from './reminders.controller';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Enrollment, EnrollmentSchema } from './enrollment.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { CarService, ServiceSchema } from '../services/schemas/service.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { BookingsModule } from '../bookings/bookings.module';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController, EnrollmentReviewGuard } from './enrollments.controller';
@Module({
  imports: [
    BookingsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: CarService.name, schema: ServiceSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [EnrollmentsController, PlanRemindersController],
  providers: [EnrollmentsService, EnrollmentReviewGuard],
})
export class EnrollmentsModule {}
