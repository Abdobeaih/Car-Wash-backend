import { Model, Types } from 'mongoose';
import { NotificationsService } from '../src/notifications/notifications.service';
import { NotificationDocument } from '../src/notifications/schemas/notification.schema';
import { UserDocument } from '../src/users/schemas/user.schema';
import { BookingStatus } from '../src/bookings/schemas/booking.schema';

describe('New notification currency copy', () => {
  const booking = {
    _id: 'booking-1',
    customerId: { name: 'Test Customer' },
    serviceId: { name: 'Exterior Car Wash' },
    vehicleId: { brand: 'Test', model: 'Car' },
    date: '2030-01-15',
    startTime: '10:00',
    endTime: '11:00',
    total: 1234.5,
  };
  let service: NotificationsService;
  let create: jest.SpyInstance;
  beforeEach(() => {
    const users = {
      find: () => ({ lean: () => ({ exec: async () => [{ _id: new Types.ObjectId() }] }) }),
    };
    service = new NotificationsService(
      {} as Model<NotificationDocument>,
      users as unknown as Model<UserDocument>,
    );
    create = jest.spyOn(service, 'create').mockResolvedValue({} as NotificationDocument);
  });
  it('labels new admin booking requests in EGP without changing totals', async () => {
    await service.notifyAdminsOfNewBooking(booking);
    const input = create.mock.calls[0][1];
    expect(input.message).toContain('Total: EGP 1234.5.');
    expect(input.message).not.toContain('$');
    expect(input.data.total).toBe(1234.5);
  });
  it('labels completed customer bookings in EGP without changing totals', async () => {
    await service.createBookingStatusNotification('user-1', booking, BookingStatus.COMPLETED);
    const input = create.mock.calls[0][1];
    expect(input.message).toContain('Total: EGP 1234.5.');
    expect(input.message).not.toContain('$');
    expect(input.data.total).toBe(1234.5);
  });
  it('returns existing notification text unchanged', async () => {
    const historical = [{ message: 'Historical total: $200.', data: { total: 200 } }];
    const model = {
      find: () => ({ sort: () => ({ limit: () => ({ exec: async () => historical }) }) }),
    };
    const reader = new NotificationsService(
      model as unknown as Model<NotificationDocument>,
      {} as Model<UserDocument>,
    );
    expect(await reader.findAllForUser('user-1')).toBe(historical);
    expect(historical[0].message).toBe('Historical total: $200.');
  });
});
