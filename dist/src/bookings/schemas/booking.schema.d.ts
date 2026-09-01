import { HydratedDocument } from 'mongoose';
export type BookingDocument = HydratedDocument<Booking>;
export declare enum BookingStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID"
}
export declare class BookingLocation {
    country: string;
    city: string;
    address: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
}
export declare class BookingServiceItem {
    serviceId: string;
    addOnIds: string[];
    duration: number;
    subtotal: number;
}
export declare class Booking {
    customerId: string;
    vehicleId: string;
    serviceId: string;
    addOnIds: string[];
    services: BookingServiceItem[];
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    subtotal: number;
    total: number;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    location: BookingLocation;
}
export declare const BookingSchema: any;
