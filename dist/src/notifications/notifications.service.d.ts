import { Model, Types } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { BookingStatus } from '../bookings/schemas/booking.schema';
import { NotificationDocument, NotificationType } from './schemas/notification.schema';
interface BookingLike {
    _id?: string | Types.ObjectId;
    customerId: string | Types.ObjectId | {
        _id?: string;
        name?: string;
    };
    serviceId: string | {
        name?: string;
    };
    vehicleId: string | {
        brand?: string;
        model?: string;
    };
    date: string;
    startTime: string;
    endTime: string;
    total: number;
}
export declare class NotificationsService {
    private readonly notificationModel;
    private readonly userModel;
    constructor(notificationModel: Model<NotificationDocument>, userModel: Model<UserDocument>);
    create(recipientId: string, input: {
        type: NotificationType;
        title: string;
        message: string;
        data: Record<string, unknown>;
    }): Promise<NotificationDocument>;
    createBookingStatusNotification(recipientId: string, booking: BookingLike, status: BookingStatus): Promise<NotificationDocument>;
    notifyAdminsOfCancellation(booking: BookingLike): Promise<void>;
    notifyAdminsOfNewBooking(booking: BookingLike): Promise<void>;
    notifyAdminsOfContactMessage(input: {
        name: string;
        email: string;
        message: string;
        contactId: string;
    }): Promise<void>;
    findAllForUser(recipientId: string): Promise<NotificationDocument[]>;
    getUnreadCount(recipientId: string): Promise<number>;
    markAsRead(recipientId: string, id: string): Promise<NotificationDocument>;
    markAllAsRead(recipientId: string): Promise<{
        modified: number;
    }>;
    private buildStatusCopy;
    private idOf;
    private serviceName;
    private vehicleName;
    private customerName;
    private adminIds;
    private notifyAdmins;
}
export {};
