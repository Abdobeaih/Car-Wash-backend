import { Connection, createConnection } from 'mongoose';
import { EnrollmentSchema } from '../src/plans/enrollment.schema';
import { BookingSchema } from '../src/bookings/schemas/booking.schema';
import { MongoMemoryServer } from 'mongodb-memory-server';
describe('Plan flag-off startup side effects', () => {
  it('never auto-creates plan collections/indexes and adds no plan booking index declaration', async () => {
    expect(EnrollmentSchema.options.autoCreate).toBe(false);
    expect(EnrollmentSchema.options.autoIndex).toBe(false);
    expect(BookingSchema.indexes().some(([fields]) => 'redemptionKey' in fields)).toBe(false);
    expect(BookingSchema.indexes().some(([fields]) => 'occupiedMinutes' in fields)).toBe(true);
    expect(BookingSchema.path('enrollmentId')).toBeDefined();
    const db = await MongoMemoryServer.create();
    let connection: Connection | undefined;
    try {
      connection = await createConnection(db.getUri('flag-off'), {
        autoCreate: true,
        autoIndex: true,
      }).asPromise();
      const plan = connection.model('Enrollment', EnrollmentSchema);
      const booking = connection.model('Booking', BookingSchema);
      await Promise.all([plan.init(), booking.init()]);
      const names = (await connection.db!.listCollections().toArray()).map((c) => c.name);
      expect(names).not.toContain('enrollments');
      const indexes = await booking.collection.indexes();
      expect(indexes.some((index) => 'redemptionKey' in index.key)).toBe(false);
      expect(indexes.some((index) => 'occupiedMinutes' in index.key)).toBe(true);
    } finally {
      await connection?.close();
      await db.stop();
    }
  }, 60000);
});
