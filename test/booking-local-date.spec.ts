import { BookingsService } from '../src/bookings/bookings.service';
import { Model } from 'mongoose';
import { BookingDocument } from '../src/bookings/schemas/booking.schema';
import { Vehicle } from '../src/vehicles/schemas/vehicle.schema';
import { CarService } from '../src/services/schemas/service.schema';
import { AddOn } from '../src/addons/schemas/addon.schema';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('Booking calendar date in Cairo', () => {
  afterEach(() => jest.useRealTimers());
  const service = new BookingsService(
    {} as Model<BookingDocument>,
    {} as Model<Vehicle>,
    {} as Model<CarService>,
    {} as Model<AddOn>,
    {} as NotificationsService,
  );
  const validate = (date: string) =>
    (service as unknown as { validateDate: (date: string) => void }).validateDate(date);
  it('rejects yesterday in Cairo even when the server is still on the previous UTC date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2030-01-01T23:30:00Z'));
    expect(() => validate('2030-01-01')).toThrow('Booking date cannot be in the past.');
    expect(() => validate('2030-01-02')).not.toThrow();
  });
  it('rejects rolled-over and malformed calendar dates', () => {
    jest.useFakeTimers().setSystemTime(new Date('2030-01-01T12:00:00Z'));
    expect(() => validate('2030-02-30')).toThrow('Invalid date.');
    expect(() => validate('2030-2-03')).toThrow('Invalid date.');
  });
});
