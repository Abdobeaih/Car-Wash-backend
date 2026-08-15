import { Model } from 'mongoose';
import { CarService } from '../services/schemas/service.schema';
import { BookingDocument } from './schemas/booking.schema';
export interface TimeSlot {
    start: string;
    end: string;
    available: boolean;
}
export declare class AvailabilityService {
    private readonly serviceModel;
    private readonly bookingModel;
    constructor(serviceModel: Model<CarService>, bookingModel: Model<BookingDocument>);
    getAvailableSlots(date: string, serviceIds: string[]): Promise<TimeSlot[]>;
    hasConflict(date: string, startTime: string, endTime: string): Promise<boolean>;
}
