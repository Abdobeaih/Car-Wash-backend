import { HydratedDocument } from 'mongoose';
import { BookingStatus } from '../../bookings/schemas/booking.schema';
export type NotificationDocument = HydratedDocument<Notification>;
export declare enum NotificationType {
    BOOKING_STATUS = "BOOKING_STATUS",
    CONTACT_MESSAGE = "CONTACT_MESSAGE"
}
export declare class NotificationData {
    bookingId?: string;
    status?: BookingStatus;
    date?: string;
    startTime?: string;
    endTime?: string;
    serviceName?: string;
    vehicleName?: string;
    contactId?: string;
    name?: string;
    email?: string;
    total?: number;
}
export declare class Notification {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    data: NotificationData;
    read: boolean;
}
export declare const NotificationSchema: any;
