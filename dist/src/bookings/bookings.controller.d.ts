import { RequestUser } from '../common/interfaces/request-user.interface';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
export declare class BookingsController {
    private readonly bookingsService;
    private readonly availabilityService;
    constructor(bookingsService: BookingsService, availabilityService: AvailabilityService);
    getAvailability(query: AvailabilityQueryDto): Promise<import("./availability.service").TimeSlot[]>;
    create(user: RequestUser, dto: CreateBookingDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    findAll(user: RequestUser): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findOne(user: RequestUser, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    cancel(user: RequestUser, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
}
