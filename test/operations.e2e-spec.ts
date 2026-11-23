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
