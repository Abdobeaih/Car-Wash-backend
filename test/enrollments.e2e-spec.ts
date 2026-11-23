import { UserRole } from '../src/common/constants/roles';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/otp/mail.service';
import { SmsService } from '../src/otp/sms.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../src/users/schemas/user.schema';
import { Vehicle, VehicleType } from '../src/vehicles/schemas/vehicle.schema';
import { CarService, ServiceDocument } from '../src/services/schemas/service.schema';

jest.setTimeout(120000);
describe('Plan enrollment transactional boundaries', () => {
  let app: INestApplication,
    db: MongoMemoryReplSet,
    admin: string,
    customer: string,
    other: string,
    vehicle: string,
    service: string;
  const original = { ...process.env };
  const http = () => request(app.getHttpServer());
  beforeAll(async () => {
    db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.DATABASE_URL = db.getUri('plans');
    process.env.JWT_SECRET = 'plans-local-fixture-only';
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
    // Explicit local migration only. Production requires publisher-approved migration.
    await app.get(getModelToken('Enrollment')).createCollection();
    await app.get(getModelToken('Enrollment')).createIndexes();
    await app.get(getModelToken('Booking')).collection.createIndex(
      { redemptionKey: 1 },
      {
        name: 'booking_plan_redemption_unique',
        unique: true,
        partialFilterExpression: { redemptionKey: { $type: 'string' } },
      },
    );
    const users = app.get<Model<User>>(getModelToken(User.name)),
      jwt = app.get(JwtService);
    const a = await users.create({
      name: 'Admin',
      email: 'plan-admin@example.test',
      password: 'unused',
      role: UserRole.ADMIN,
      emailVerified: true,
    });
    const c = await users.create({
      name: 'Customer',
      email: 'plan-customer@example.test',
      password: 'unused',
      role: UserRole.CUSTOMER,
      emailVerified: true,
    });
    const o = await users.create({
      name: 'Other',
      email: 'plan-other@example.test',
      password: 'unused',
      role: UserRole.CUSTOMER,
      emailVerified: true,
    });
    admin = jwt.sign({ sub: a._id.toString(), role: 'ADMIN', email: a.email });
    customer = jwt.sign({ sub: c._id.toString(), role: 'CUSTOMER', email: c.email });
    other = jwt.sign({ sub: o._id.toString(), role: 'CUSTOMER', email: o.email });
    const v = await app.get<Model<Vehicle>>(getModelToken(Vehicle.name)).create({
      userId: c._id.toString(),
      brand: 'Test',
      model: 'Car',
      year: 2020,
      color: 'Black',
      plateNumber: 'TEST123',
      vehicleType: VehicleType.SEDAN,
    });
    vehicle = v._id.toString();
    const catalog = app.get<Model<ServiceDocument>>(getModelToken(CarService.name));
    await catalog.deleteMany({});
    const s = await catalog.create({
      name: 'Fixture wash',
      slug: 'exterior-car-wash',
      description: 'Fixture',
      image: '/x.svg',
      basePrice: 100,
      duration: 60,
      isActive: true,
    });
    service = s._id.toString();
  });
  afterAll(async () => {
    await app?.close();
    await db?.stop();
    process.env = original;
  });
  beforeEach(async () => {
    process.env.ENABLE_PLAN_ENROLLMENTS = 'true';
    await app.get(getModelToken('Booking')).deleteMany({});
    await app.get(getModelToken('Enrollment')).deleteMany({});
    await app.get(getModelToken('Notification')).deleteMany({});
  });
  async function activate(key = 'activate-fixture-1') {
    const users = app.get<Model<User>>(getModelToken(User.name));
    const user = await users.findOne({ email: 'plan-customer@example.test' }).exec();
    return http()
      .post('/plans/admin/enrollments')
      .auth(admin, { type: 'bearer' })
      .send({
        customerId: user!._id.toString(),
        vehicleId: vehicle,
        planCode: 'monthlyExterior',
        activationKey: key,
        paymentReceived: true,
      })
      .expect(201);
  }
  function payload(
    _enrollment: unknown,
    key = 'request-fixture-1',
    date = '2030-01-15',
    startTime = '10:00',
  ) {
    return {
      requestKey: key,
      booking: {
        vehicleId: vehicle,
        services: [{ serviceId: service, addOnIds: [] }],
        date,
        startTime,
        location: { country: 'Egypt', city: 'Cairo', address: 'Fixture location' },
      },
    };
  }
  it('hides enrollment endpoints by default and enforces roles', async () => {
    delete process.env.ENABLE_PLAN_ENROLLMENTS;
    await http().get('/plans/enrollments').auth(customer, { type: 'bearer' }).expect(404);
    process.env.ENABLE_PLAN_ENROLLMENTS = 'true';
    await http()
      .post('/plans/admin/enrollments')
      .auth(customer, { type: 'bearer' })
      .send({})
      .expect(403);
  });
  it('activates approved terms once, storing the terms snapshot', async () => {
    const one = await activate();
    const two = await activate();
    expect(one.body._id).toBe(two.body._id);
    expect(one.body.price).toBe(750);
    expect(one.body.remaining['exterior-car-wash']).toBe(4);
    expect(one.body.currency).toBe('EGP');
    expect(one.body.termsVersion).toBeDefined();
  });
  it('rolls back allowance when booking creation conflicts', async () => {
    const one = await activate();
    const id = one.body._id;
    const now = new Date();
    const date = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
    await http()
      .post('/plans/enrollments/' + id + '/visits')
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'first-request', date))
      .expect(201);
    await http()
      .post('/plans/enrollments/' + id + '/visits')
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'second-request', date))
      .expect(409);
    const stored = await app.get(getModelToken('Enrollment')).findById(id).lean();
    expect(stored.remaining['exterior-car-wash']).toBe(3);
  });
  it('creates one booking on idempotent replay and zero separate visit value', async () => {
    const one = await activate();
    const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const path = '/plans/enrollments/' + one.body._id + '/visits';
    const first = await http()
      .post(path)
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'same-request', date))
      .expect(201);
    const replay = await http()
      .post(path)
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'same-request', date))
      .expect(201);
    expect(first.body._id).toBe(replay.body._id);
    expect(first.body.total).toBe(0);
    expect(first.body.subtotal).toBe(0);
    expect(first.body.services[0].subtotal).toBe(0);
    expect(
      await app
        .get(getModelToken('Notification'))
        .countDocuments({ title: 'New plan visit / زيارة باقة جديدة' }),
    ).toBe(await app.get(getModelToken(User.name)).countDocuments({ role: UserRole.ADMIN }));
    expect(await app.get(getModelToken('Booking')).countDocuments({})).toBe(1);
  });
  it('denies another owner and restores a timely cancelled visit only once', async () => {
    const one = await activate();
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const path = '/plans/enrollments/' + one.body._id;
    await http()
      .post(path + '/visits')
      .auth(other, { type: 'bearer' })
      .send(payload(one.body, 'other-request', date))
      .expect(404);
    const visit = await http()
      .post(path + '/visits')
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'timely-request', date))
      .expect(201);
    for (let n = 0; n < 2; n++)
      await http()
        .post(path + '/visits/' + visit.body._id + '/cancel')
        .auth(customer, { type: 'bearer' })
        .expect(201);
    const stored = await app.get(getModelToken('Enrollment')).findById(one.body._id).lean();
    expect(stored.remaining['exterior-car-wash']).toBe(4);
  });
  it('allows only one concurrent redemption of the last allowance', async () => {
    const one = await activate();
    await app
      .get(getModelToken('Enrollment'))
      .updateOne({ _id: one.body._id }, { $set: { 'remaining.exterior-car-wash': 1 } });
    const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const path = '/plans/enrollments/' + one.body._id + '/visits';
    const results = await Promise.all(
      ['10:00', '12:00'].map((time, n) =>
        http()
          .post(path)
          .auth(customer, { type: 'bearer' })
          .send(payload(one.body, 'last-visit-' + n, date, time)),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await app.get(getModelToken('Booking')).countDocuments({})).toBe(1);
  });
  it('reschedules without spending another allowance and supports replay', async () => {
    const one = await activate();
    const date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    const path = '/plans/enrollments/' + one.body._id;
    const visit = await http()
      .post(path + '/visits')
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'before-move', date))
      .expect(201);
    const move = payload(one.body, 'move-request', date, '12:00');
    const next = await http()
      .post(path + '/visits/' + visit.body._id + '/reschedule')
      .auth(customer, { type: 'bearer' })
      .send(move)
      .expect(201);
    const repeat = await http()
      .post(path + '/visits/' + visit.body._id + '/reschedule')
      .auth(customer, { type: 'bearer' })
      .send(move)
      .expect(201);
    expect(next.body._id).toBe(repeat.body._id);
    const stored = await app.get(getModelToken('Enrollment')).findById(one.body._id).lean();
    expect(stored.remaining['exterior-car-wash']).toBe(3);
  });
  it('sends one expiry reminder even on repeated processing', async () => {
    const one = await activate();
    await app
      .get(getModelToken('Enrollment'))
      .updateOne({ _id: one.body._id }, { $set: { endsAt: new Date(Date.now() + 2 * 86400000) } });
    for (let n = 0; n < 2; n++)
      await http().post('/plans/admin/reminders').auth(admin, { type: 'bearer' }).expect(201);
    expect(
      await app
        .get(getModelToken('Notification'))
        .countDocuments({ title: 'Plan ending soon / باقتك تنتهي قريبًا' }),
    ).toBe(1);
  });
  it('protects scheduled processing with feature flag and secret', async () => {
    delete process.env.CRON_SECRET;
    await http().get('/internal/plan-reminders').expect(401);
    process.env.CRON_SECRET = 'synthetic-local-cron-secret-for-tests-only';
    await http().get('/internal/plan-reminders').set('Authorization', 'Bearer wrong').expect(401);
    await http()
      .get('/internal/plan-reminders')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET}`)
      .expect(200);
    delete process.env.ENABLE_PLAN_ENROLLMENTS;
    await http()
      .get('/internal/plan-reminders')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET}`)
      .expect(404);
    process.env.ENABLE_PLAN_ENROLLMENTS = 'true';
  });
  it('rejects changed payload on replay without spending another visit', async () => {
    const one = await activate();
    const date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      path = `/plans/enrollments/${one.body._id}/visits`;
    await http()
      .post(path)
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'unchanged-key', date))
      .expect(201);
    await http()
      .post(path)
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'unchanged-key', date, '12:00'))
      .expect(409);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(3);
  });
  it('replays concurrent identical requests exactly once', async () => {
    const one = await activate();
    const date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      path = `/plans/enrollments/${one.body._id}/visits`,
      body = payload(one.body, 'concurrent-same-key', date);
    const results = await Promise.all(
      [0, 1].map(() => http().post(path).auth(customer, { type: 'bearer' }).send(body)),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results[0].body._id).toBe(results[1].body._id);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(3);
  });
  it('refuses expired redemptions and does not restore late cancellations', async () => {
    const one = await activate();
    const date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      path = `/plans/enrollments/${one.body._id}`;
    const visit = await http()
      .post(path + '/visits')
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'late-cancel-test', date))
      .expect(201);
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(
      new Date(),
    );
    await app
      .get(getModelToken('Booking'))
      .updateOne({ _id: visit.body._id }, { $set: { date: localDate, startTime: '23:59' } });
    await http()
      .post(path + '/visits/' + visit.body._id + '/cancel')
      .auth(customer, { type: 'bearer' })
      .expect(201);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(3);
    await app
      .get(getModelToken('Enrollment'))
      .updateOne({ _id: one.body._id }, { $set: { endsAt: new Date(Date.now() - 1000) } });
    await http()
      .post(path + '/visits')
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'expired-plan-test', date, '12:00'))
      .expect(400);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(3);
  });
  it('fails closed when deployment does not support transactions', async () => {
    const one = await activate(),
      date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    const dbConnection = app.get<Connection>(getConnectionToken());
    const spy = jest.spyOn(dbConnection, 'startSession').mockResolvedValue({
      withTransaction: async () => {
        throw Object.assign(new Error('unsupported transaction'), { code: 20 });
      },
      endSession: async () => {},
    } as never);
    try {
      await http()
        .post(`/plans/enrollments/${one.body._id}/visits`)
        .auth(customer, { type: 'bearer' })
        .send(payload(one.body, 'unsupported-transaction', date))
        .expect(503);
    } finally {
      spy.mockRestore();
    }
    expect(await app.get(getModelToken('Booking')).countDocuments({})).toBe(0);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(4);
  });
  it('admin cancellation restores once and cannot reactivate the cancelled covered visit', async () => {
    const one = await activate(),
      date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    const visit = await http()
      .post(`/plans/enrollments/${one.body._id}/visits`)
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'admin-cancellation', date))
      .expect(201);
    await http()
      .post(`/plans/admin/enrollments/${one.body._id}/visits/${visit.body._id}/cancel`)
      .auth(admin, { type: 'bearer' })
      .expect(201);
    await http()
      .patch(`/admin/bookings/${visit.body._id}/status`)
      .auth(admin, { type: 'bearer' })
      .send({ status: 'CONFIRMED' })
      .expect(400);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(4);
  });
  it('replays simultaneous activation and rescheduling without extra receipts or visits', async () => {
    const both = await Promise.all([
      activate('parallel-activation'),
      activate('parallel-activation'),
    ]);
    expect(both[0].body._id).toBe(both[1].body._id);
    expect(await app.get(getModelToken('Enrollment')).countDocuments({})).toBe(1);
    const one = both[0],
      date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      path = `/plans/enrollments/${one.body._id}`;
    const visit = await http()
      .post(path + '/visits')
      .auth(customer, { type: 'bearer' })
      .send(payload(one.body, 'parallel-before', date))
      .expect(201);
    const results = await Promise.all(
      [0, 1].map(() =>
        http()
          .post(path + '/visits/' + visit.body._id + '/reschedule')
          .auth(customer, { type: 'bearer' })
          .send(payload(one.body, 'parallel-move', date, '12:00')),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results[0].body._id).toBe(results[1].body._id);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(3);
  });
  it('bounds each reminder batch to100 earliest pending plans', async () => {
    const one = await activate(),
      model = app.get(getModelToken('Enrollment'));
    const stored = await model.findById(one.body._id).lean();
    delete stored._id;
    delete stored.__v;
    await model.deleteMany({});
    await model.insertMany(
      Array.from({ length: 101 }, (_, n) => ({
        ...stored,
        activationKey: `batch-${n}`,
        endsAt: new Date(Date.now() + 2 * 86400000 + n * 1000),
      })),
    );
    const due = await http()
      .get('/plans/admin/reminders-due')
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(due.body).toHaveLength(100);
  });
  it('rolls back booking and allowance when transactional notification fails', async () => {
    const one = await activate(),
      date = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      notifications = app.get(getModelToken('Notification'));
    const spy = jest
      .spyOn(notifications, 'create')
      .mockRejectedValueOnce(new Error('synthetic notification failure'));
    try {
      await http()
        .post(`/plans/enrollments/${one.body._id}/visits`)
        .auth(customer, { type: 'bearer' })
        .send(payload(one.body, 'notification-rollback', date))
        .expect(500);
    } finally {
      spy.mockRestore();
    }
    expect(await app.get(getModelToken('Booking')).countDocuments({})).toBe(0);
    expect(
      (await app.get(getModelToken('Enrollment')).findById(one.body._id)).remaining[
        'exterior-car-wash'
      ],
    ).toBe(4);
  });
  it('fails closed before migration indexes exist', async () => {
    const model = app.get(getModelToken('Booking'));
    await model.collection.dropIndex('booking_plan_redemption_unique');
    try {
      const users = app.get(getModelToken(User.name)),
        user = await users.findOne({ email: 'plan-customer@example.test' });
      await http()
        .post('/plans/admin/enrollments')
        .auth(admin, { type: 'bearer' })
        .send({
          customerId: user._id.toString(),
          vehicleId: vehicle,
          planCode: 'monthlyExterior',
          paymentReceived: true,
          activationKey: 'missing-index-test',
        })
        .expect(503);
      expect(await app.get(getModelToken('Enrollment')).countDocuments({})).toBe(0);
    } finally {
      await model.collection.createIndex(
        { redemptionKey: 1 },
        {
          name: 'booking_plan_redemption_unique',
          unique: true,
          partialFilterExpression: { redemptionKey: { $type: 'string' } },
        },
      );
    }
  });
});
