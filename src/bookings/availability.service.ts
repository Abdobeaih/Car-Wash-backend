import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CarService } from '../services/schemas/service.schema';
import { Booking, BookingDocument, BookingStatus } from './schemas/booking.schema';
import { slotMinutes, workingStartMinutes, workingEndMinutes } from './working-hours.util';

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(CarService.name) private readonly serviceModel: Model<CarService>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
  ) {}

  async getAvailableSlots(date: string, serviceIds: string[]): Promise<TimeSlot[]> {
    if (serviceIds.length === 0) {
      throw new NotFoundException('No services provided.');
    }
    const services = await this.serviceModel.find({ _id: { $in: serviceIds } }).exec();
    if (services.length !== serviceIds.length || services.some((s) => !s.isActive)) {
      throw new NotFoundException('One or more services were not found or are inactive.');
    }

    const start = workingStartMinutes();
    const end = workingEndMinutes();
    const step = slotMinutes();
    const duration = services.reduce((sum, s) => sum + s.duration, 0);

    const slots: TimeSlot[] = [];
    for (let t = start; t + duration <= end; t += step) {
      slots.push({
        start: toHHMM(t),
        end: toHHMM(t + duration),
        available: true,
      });
    }

    const existing = await this.bookingModel
      .find({
        date,
        status: { $ne: BookingStatus.CANCELLED },
      })
      .exec();

    return slots.map((slot) => {
      const overlaps = existing.some((booking) => timeOverlaps(slot, booking));
      return { ...slot, available: !overlaps };
    });
  }

  async hasConflict(date: string, startTime: string, endTime: string): Promise<boolean> {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    const existing = await this.bookingModel
      .find({
        date,
        status: { $ne: BookingStatus.CANCELLED },
      })
      .exec();

    return existing.some((booking) => {
      const bStart = toMinutes(booking.startTime);
      const bEnd = toMinutes(booking.endTime);
      return start < bEnd && end > bStart;
    });
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeOverlaps(slot: TimeSlot, booking: Booking): boolean {
  const s = toMinutes(slot.start);
  const e = toMinutes(slot.end);
  const bs = toMinutes(booking.startTime);
  const be = toMinutes(booking.endTime);
  return s < be && e > bs;
}
