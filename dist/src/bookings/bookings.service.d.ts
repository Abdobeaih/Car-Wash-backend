import { Model } from 'mongoose';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { CarService } from '../services/schemas/service.schema';
import { AddOn } from '../addons/schemas/addon.schema';
import { BookingDocument } from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class BookingsService {
    private readonly bookingModel;
    private readonly vehicleModel;
    private readonly serviceModel;
    private readonly addOnModel;
    private readonly notificationsService;
    constructor(bookingModel: Model<BookingDocument>, vehicleModel: Model<Vehicle>, serviceModel: Model<CarService>, addOnModel: Model<AddOn>, notificationsService: NotificationsService);
    create(customerId: string, dto: CreateBookingDto): Promise<BookingDocument>;
    findAllForCustomer(customerId: string): Promise<BookingDocument[]>;
    findForCustomer(customerId: string, id: string): Promise<BookingDocument>;
    cancelForCustomer(customerId: string, id: string): Promise<BookingDocument>;
    private validateDate;
    private validateTimeWithinWorkingHours;
    private computeEndTime;
    private timeToMinutes;
    private populateBooking;
}
