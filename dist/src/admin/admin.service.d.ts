import { Model, Types } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { CarService, ServiceDocument } from '../services/schemas/service.schema';
import { AddOn, AddOnDocument } from '../addons/schemas/addon.schema';
import { CreateServiceDto, UpdateServiceDto } from '../services/dto/service.dto';
import { CreateAddOnDto, UpdateAddOnDto } from '../addons/dto/addon.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/constants/roles';
export declare class AdminService {
    private readonly userModel;
    private readonly bookingModel;
    private readonly serviceModel;
    private readonly addOnModel;
    private readonly notificationsService;
    private readonly logger;
    constructor(userModel: Model<UserDocument>, bookingModel: Model<BookingDocument>, serviceModel: Model<ServiceDocument>, addOnModel: Model<AddOnDocument>, notificationsService: NotificationsService);
    getDashboard(): Promise<{
        totalBookings: number;
        pendingBookings: number;
        confirmedBookings: number;
        completedBookings: number;
        customers: number;
        revenue: any;
    }>;
    getCalendar(start?: string, end?: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    getServices(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, CarService, {}, import("mongoose").DefaultSchemaOptions> & CarService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, CarService, {}, import("mongoose").DefaultSchemaOptions> & CarService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    createService(dto: CreateServiceDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, CarService, {}, import("mongoose").DefaultSchemaOptions> & CarService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, CarService, {}, import("mongoose").DefaultSchemaOptions> & CarService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    updateService(id: string, dto: UpdateServiceDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, CarService, {}, import("mongoose").DefaultSchemaOptions> & CarService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, CarService, {}, import("mongoose").DefaultSchemaOptions> & CarService & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    deleteService(id: string): Promise<void>;
    getAddOns(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AddOn, {}, import("mongoose").DefaultSchemaOptions> & AddOn & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, AddOn, {}, import("mongoose").DefaultSchemaOptions> & AddOn & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    createAddOn(dto: CreateAddOnDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AddOn, {}, import("mongoose").DefaultSchemaOptions> & AddOn & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, AddOn, {}, import("mongoose").DefaultSchemaOptions> & AddOn & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    updateAddOn(id: string, dto: UpdateAddOnDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AddOn, {}, import("mongoose").DefaultSchemaOptions> & AddOn & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, AddOn, {}, import("mongoose").DefaultSchemaOptions> & AddOn & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    deleteAddOn(id: string): Promise<void>;
    getBookings(status?: string, search?: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    getBooking(id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    updateBookingStatus(id: string, dto: UpdateBookingStatusDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Booking, {}, import("mongoose").DefaultSchemaOptions> & Booking & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: Types.ObjectId;
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
