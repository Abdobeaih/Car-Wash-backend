import { UserRole } from '../common/constants/roles';
import { AdminService } from './admin.service';
import { CreateServiceDto, UpdateServiceDto } from '../services/dto/service.dto';
import { CreateAddOnDto, UpdateAddOnDto } from '../addons/dto/addon.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboard(): Promise<{
        totalBookings: number;
        pendingBookings: number;
        confirmedBookings: number;
        completedBookings: number;
        customers: number;
        revenue: any;
    }>;
    getCalendar(start?: string, end?: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    getServices(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../services/schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("../services/schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../services/schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("../services/schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    createService(dto: CreateServiceDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../services/schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("../services/schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../services/schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("../services/schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    updateService(id: string, dto: UpdateServiceDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../services/schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("../services/schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../services/schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("../services/schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    deleteService(id: string): Promise<void>;
    getAddOns(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../addons/schemas/addon.schema").AddOn, {}, import("mongoose").DefaultSchemaOptions> & import("../addons/schemas/addon.schema").AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../addons/schemas/addon.schema").AddOn, {}, import("mongoose").DefaultSchemaOptions> & import("../addons/schemas/addon.schema").AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    createAddOn(dto: CreateAddOnDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../addons/schemas/addon.schema").AddOn, {}, import("mongoose").DefaultSchemaOptions> & import("../addons/schemas/addon.schema").AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../addons/schemas/addon.schema").AddOn, {}, import("mongoose").DefaultSchemaOptions> & import("../addons/schemas/addon.schema").AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    updateAddOn(id: string, dto: UpdateAddOnDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../addons/schemas/addon.schema").AddOn, {}, import("mongoose").DefaultSchemaOptions> & import("../addons/schemas/addon.schema").AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../addons/schemas/addon.schema").AddOn, {}, import("mongoose").DefaultSchemaOptions> & import("../addons/schemas/addon.schema").AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    deleteAddOn(id: string): Promise<void>;
    getBookings(status?: string, search?: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    getBooking(id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    updateBookingStatus(id: string, dto: UpdateBookingStatusDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../bookings/schemas/booking.schema").Booking, {}, import("mongoose").DefaultSchemaOptions> & import("../bookings/schemas/booking.schema").Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    getCustomers(search?: string): Promise<{
        _id: string;
        name: string;
        email: string;
        role: UserRole;
        bookingCount: number;
        createdAt: Date | undefined;
    }[]>;
}
