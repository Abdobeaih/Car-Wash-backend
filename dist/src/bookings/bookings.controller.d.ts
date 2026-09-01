import { RequestUser } from '../common/interfaces/request-user.interface';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
export declare class BookingsController {
    private readonly bookingsService;
    private readonly availabilityService;
    constructor(bookingsService: BookingsService, availabilityService: AvailabilityService);
    getAvailability(query: AvailabilityQueryDto): Promise<{}>;
    create(user: RequestUser, dto: CreateBookingDto): Promise<HydratedDocument<import("./schemas/booking.schema").Booking>>;
    findAll(user: RequestUser): Promise<{}>;
    findOne(user: RequestUser, id: string): Promise<HydratedDocument<import("./schemas/booking.schema").Booking>>;
    cancel(user: RequestUser, id: string): Promise<HydratedDocument<import("./schemas/booking.schema").Booking>>;
}
