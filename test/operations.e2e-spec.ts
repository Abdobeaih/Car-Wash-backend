import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { UserRole } from '../src/common/constants/roles';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Booking, BookingDocument } from '../src/bookings/schemas/booking.schema';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import { CarService, ServiceDocument } from '../src/services/schemas/service.schema';
import { MailService } from '../src/otp/mail.service';
import { SmsService } from '../src/otp/sms.service';

jest.setTimeout(180000);
describe('Car-wash operations with HTTP and temporary MongoDB', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  let bookings: Model<BookingDocument>;
  let adminToken: string;
  let customerToken: string;
  let customer: Types.ObjectId;
  let serviceId: Types.ObjectId;
  const original = { ...process.env };
  const id = () => new Types.ObjectId();
  const http = () => request(app.getHttpServer());
  const auth = () =>
    http()
      .get('/admin/analytics?start=2030-01-01&end=2030-01-31')
      .auth(adminToken, { type: 'bearer' });
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.DATABASE_URL = mongo.getUri('operations');
    process.env.JWT_SECRET = 'local-operations-fixture-signing-key';
    delete process.env.SEED_ADMIN_EMAIL;
    delete process.env.SEED_ADMIN_PASSWORD;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({ sendOtpEmail: jest.fn() })
      .overrideProvider(SmsService)
      .useValue({ sendOtpSms: jest.fn() })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    bookings = app.get(getModelToken(Booking.name));
    const users: Model<UserDocument> = app.get(getModelToken(User.name));
    const admin = await users.create({
      name: 'Operations admin',
      email: 'ops-admin@example.com',
      password: 'not-used',
      role: UserRole.ADMIN,
      emailVerified: true,
    });
    const person = await users.create({
      name: 'Operations customer',
      email: 'ops-customer@example.com',
      password: 'not-used',
      role: UserRole.CUSTOMER,
      emailVerified: true,
    });
    customer = person._id;
    const jwt = app.get(JwtService);
    adminToken = jwt.sign({ sub: admin._id.toString(), role: 'ADMIN', email: admin.email });
    customerToken = jwt.sign({ sub: customer.toString(), role: 'CUSTOMER', email: person.email });
    const catalog: Model<ServiceDocument> = app.get(getModelToken(CarService.name));
    const service = await catalog.create({
      name: 'Wash',
      slug: 'wash',
      description: 'Fixture',
      image: 'https://example.com/wash.webp',
      basePrice: 100,
      duration: 60,
      isActive: true,
    });
    serviceId = service._id;
  });
  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
    process.env = original;
  });
  beforeEach(async () => {
    await bookings.deleteMany({});
  });
  it.each([false, true])(
    'rejects stale status writes (version already present: %s)',
    async (versioned) => {
      const bookingId = await fixture(versioned ? { __v: 0 } : {});
      const completing = await bookings.findById(bookingId).exec();
      const cancelling = await bookings.findById(bookingId).exec();
      completing!.status = 'COMPLETED' as BookingDocument['status'];
      cancelling!.status = 'CANCELLED' as BookingDocument['status'];
      await completing!.save();
      await expect(cancelling!.save()).rejects.toMatchObject({ status: 409 });
      expect((await bookings.findById(bookingId).exec())!.status).toBe('COMPLETED');
    },
  );
  it('permits sequential status edits after reloading the latest version', async () => {
    const bookingId = await fixture();
    const first = await bookings.findById(bookingId).exec();
    first!.status = 'CONFIRMED' as BookingDocument['status'];
    await first!.save();
    const second = await bookings.findById(bookingId).exec();
    second!.status = 'COMPLETED' as BookingDocument['status'];
    await second!.save();
    expect((await bookings.findById(bookingId).exec())!.status).toBe('COMPLETED');
  });
  it('returns one HTTP409 when customer cancellation races admin completion', async () => {
    const bookingId = await fixture({ __v: 0 });
    let arrived = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = bookings.findOne.bind(bookings);
    const spy = jest.spyOn(bookings, 'findOne').mockImplementation((filter, ...args) => {
      const query = original(filter, ...args);
      if (String((filter as { _id?: unknown })._id) === bookingId) {
        const exec = query.exec.bind(query);
        query.exec = async () => {
          const document = await exec();
          if (++arrived <= 2) {
            if (arrived === 2) release();
            await barrier;
          }
          return document;
        };
      }
      return query;
    });
    try {
      const results = await Promise.all([
        http()
          .patch('/admin/bookings/' + bookingId + '/status')
          .auth(adminToken, { type: 'bearer' })
          .send({ status: 'COMPLETED' }),
        http()
          .post('/bookings/' + bookingId + '/cancel')
          .auth(customerToken, { type: 'bearer' }),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
      expect(results.find((result) => result.status === 409)!.body.message).toContain(
        'Booking changed',
      );
    } finally {
      spy.mockRestore();
    }
  });
  it('returns409 rather than500 when an admin creates a duplicate service slug', async () => {
    await http()
      .post('/admin/services')
      .auth(adminToken, { type: 'bearer' })
      .send({
        name: 'Wash duplicate',
        slug: 'wash',
        description: 'Duplicate test service',
        image: 'https://example.com/wash.webp',
        basePrice: 100,
        duration: 60,
      })
      .expect(409);
  });
  it('returns409 rather than500 when an admin renames a service to an existing slug', async () => {
    const catalog = app.get<Model<ServiceDocument>>(getModelToken(CarService.name));
    const other = await catalog.create({
      name: 'Other',
      slug: 'other-race-test',
      description: 'Fixture service',
      image: 'https://example.com/wash.webp',
      basePrice: 100,
      duration: 60,
      isActive: true,
    });
    await http()
      .patch('/admin/services/' + other._id)
      .auth(adminToken, { type: 'bearer' })
      .send({ slug: 'wash' })
      .expect(409);
  });
  async function fixture(overrides: Record<string, unknown> = {}) {
    const record = {
      _id: id(),
      customerId: customer,
      vehicleId: id(),
      serviceId,
      addOnIds: [],
      services: [{ serviceId, subtotal: 100, duration: 60, addOnIds: [] }],
      date: '2030-01-15',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      subtotal: 100,
      total: 100,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      location: { country: 'Egypt', city: 'Tanta', address: 'Local fixture' },
      ...overrides,
    };
    await bookings.collection.insertOne(record);
    return record._id.toString();
  }
  it('denies anonymous and customer reads and payment changes', async () => {
    await http().get('/admin/analytics').expect(401);
    await http().get('/admin/analytics').auth(customerToken, { type: 'bearer' }).expect(403);
    const booking = await fixture();
    await http()
      .patch(`/admin/bookings/${booking}/payment`)
      .send({ paymentStatus: 'PAID' })
      .expect(401);
    await http()
      .patch(`/admin/bookings/${booking}/payment`)
      .auth(customerToken, { type: 'bearer' })
      .send({ paymentStatus: 'PAID' })
      .expect(403);
  });
  it('separates unpaid, paid, completed and cancelled values, and filters dates', async () => {
    await fixture({ paymentStatus: 'PAID', status: 'COMPLETED' });
    await fixture({ total: 200 });
    await fixture({ status: 'CANCELLED', paymentStatus: 'PAID', total: 70 });
    await fixture({ date: '2029-12-31', total: 999 });
    const response = await auth().expect(200);
    expect(response.body.summary).toMatchObject({
      bookings: 3,
      recordedPaid: 100,
      outstanding: 200,
      bookedValue: 300,
      completedValue: 100,
      cancelledPaid: 70,
      cancelled: 1,
    });
    expect(response.body.customers).toMatchObject({ unique: 1, returning: 1 });
    expect(response.body.services[0]).toMatchObject({ count: 2, name: 'Wash' });
    const dashboard = await http()
      .get('/admin/dashboard')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(dashboard.body.revenue).toBe(100);
  });
  it('validates ranges and returns an honest empty report', async () => {
    await http()
      .get('/admin/analytics?start=2030-02-30')
      .auth(adminToken, { type: 'bearer' })
      .expect(400);
    const response = await auth().expect(200);
    expect(response.body.summary.recordedPaid).toBe(0);
    expect(response.body.daily).toEqual([]);
  });
  it('records and corrects manual payment with an audit trail and no duplicate retry entry', async () => {
    const booking = await fixture();
    const pay = () =>
      http().patch(`/admin/bookings/${booking}/payment`).auth(adminToken, { type: 'bearer' });
    const paid = await pay().send({ paymentStatus: 'PAID', reference: ' receipt 42 ' }).expect(200);
    expect(paid.body.paymentStatus).toBe('PAID');
    expect(paid.body.services[0].serviceId.name).toBe('Wash');
    expect(paid.body.paymentHistory).toHaveLength(1);
    expect(paid.body.paymentHistory[0].reference).toBe('receipt 42');
    expect(
      (await pay().send({ paymentStatus: 'PAID' }).expect(200)).body.paymentHistory,
    ).toHaveLength(1);
    expect(
      (await pay().send({ paymentStatus: 'PENDING', reference: 'correction' }).expect(200)).body
        .paymentHistory,
    ).toHaveLength(2);
    expect((await bookings.findById(booking).lean())?.paymentHistory).toBeUndefined();
  });
  it('does not duplicate history on simultaneous same-status writes', async () => {
    const booking = await fixture();
    const write = () =>
      http()
        .patch(`/admin/bookings/${booking}/payment`)
        .auth(adminToken, { type: 'bearer' })
        .send({ paymentStatus: 'PAID' });
    const results = await Promise.all([write(), write()]);
    expect(results.every((result) => [200, 409].includes(result.status))).toBe(true);
    const stored = await bookings.findById(booking).select('+paymentHistory').lean();
    expect(stored?.paymentHistory).toHaveLength(1);
  });

  it('rejects unknown fields, invalid status, long notes, missing and cancelled bookings', async () => {
    const booking = await fixture();
    const pay = (target = booking) =>
      http().patch(`/admin/bookings/${target}/payment`).auth(adminToken, { type: 'bearer' });
    await pay().send({ paymentStatus: 'PAID', total: 1 }).expect(400);
    await pay().send({ paymentStatus: 'REFUND' }).expect(400);
    await pay()
      .send({ paymentStatus: 'PAID', reference: 'x'.repeat(201) })
      .expect(400);
    await pay(id().toString()).send({ paymentStatus: 'PAID' }).expect(404);
    const cancelled = await fixture({ status: 'CANCELLED' });
    await pay(cancelled).send({ paymentStatus: 'PAID' }).expect(400);
  });
});
