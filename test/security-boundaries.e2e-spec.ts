import { NotificationsService } from '../src/notifications/notifications.service';
import { NotificationType } from '../src/notifications/schemas/notification.schema';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/otp/mail.service';
import { SmsService } from '../src/otp/sms.service';
import { UsersService } from '../src/users/users.service';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import { UserRole } from '../src/common/constants/roles';
import { OtpService } from '../src/otp/otp.service';
import { OtpPurpose } from '../src/otp/schemas/otp.schema';
import { SeedService } from '../src/seed/seed.service';
import { JwtService } from '@nestjs/jwt';
import { BookingDocument, BookingStatus } from '../src/bookings/schemas/booking.schema';

jest.setTimeout(180000);
const PASSWORD = 'Fixture-password-123!';
describe('Security boundaries (real HTTP, JWT and temporary MongoDB)', () => {
  let app: INestApplication;
  let db: MongoMemoryServer;
  let users: UsersService;
  let model: Model<UserDocument>;
  let serial = 0;
  const codes = new Map<string, string>();
  const sms = jest.fn();
  const originalEnv = { ...process.env };
  const http = () => request(app.getHttpServer());
  async function account(role = UserRole.CUSTOMER) {
    const email = `security-${++serial}@example.com`;
    const safe = await users.create({ name: 'Security fixture', email, password: PASSWORD, role });
    await users.markEmailVerified(safe._id);
    const login = await http().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
    return { id: safe._id, email, token: login.body.token as string };
  }
  beforeAll(async () => {
    db = await MongoMemoryServer.create();
    process.env.DATABASE_URL = db.getUri('security-fixtures');
    process.env.SEED_ADMIN_EMAIL = 'seed-admin@example.com';
    process.env.SEED_ADMIN_PASSWORD = PASSWORD;
    process.env.JWT_SECRET = 'local-fixture-signing-key-not-for-production';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        sendOtpEmail: async ({ to, otp }: { to: string; otp: string }) => {
          codes.set(to, otp);
          return true;
        },
      })
      .overrideProvider(SmsService)
      .useValue({ sendOtpSms: sms })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    users = app.get(UsersService);
    model = app.get(getModelToken(User.name));
  });
  afterAll(async () => {
    await app?.close();
    await db?.stop();
    process.env = originalEnv;
  });

  it.each([
    '/admin/dashboard',
    '/admin/calendar',
    '/admin/bookings',
    '/admin/customers',
    '/admin/services',
    '/admin/add-ons',
    '/admin/messages',
  ])('denies anonymous access to %s', async (path) => {
    await http().get(path).expect(401);
  });
  it.each([
    '/admin/dashboard',
    '/admin/calendar',
    '/admin/bookings',
    '/admin/customers',
    '/admin/services',
    '/admin/add-ons',
    '/admin/messages',
  ])('denies customer access to %s', async (path) => {
    const a = await account();
    await http().get(path).auth(a.token, { type: 'bearer' }).expect(403);
  });
  it('cannot self-register an admin or mass-assign a role in a profile', async () => {
    await http()
      .post('/auth/register')
      .send({
        name: 'Untrusted',
        email: 'promote@example.com',
        password: PASSWORD,
        role: UserRole.ADMIN,
      })
      .expect(400);
    expect(await model.exists({ email: 'promote@example.com' })).toBeNull();
    const a = await account();
    await http()
      .patch('/auth/me')
      .auth(a.token, { type: 'bearer' })
      .send({ role: UserRole.ADMIN })
      .expect(400);
  });
  it('does not let a session redirect recovery email; name and phone still edit', async () => {
    const a = await account();
    await http()
      .patch('/auth/me')
      .auth(a.token, { type: 'bearer' })
      .send({ email: 'redirect@example.com' })
      .expect(400);
    const res = await http()
      .patch('/auth/me')
      .auth(a.token, { type: 'bearer' })
      .send({ name: 'Updated fixture', phone: '+201012345678', email: a.email })
      .expect(200);
    expect(res.body.email).toBe(a.email);
    expect(res.body.name).toBe('Updated fixture');
    expect(res.body).not.toHaveProperty('password');
  });
  it('enforces vehicle ownership on read, update and delete', async () => {
    const a = await account();
    const b = await account();
    const car = await http()
      .post('/vehicles')
      .auth(a.token, { type: 'bearer' })
      .send({
        brand: 'Toyota',
        model: 'Test',
        year: 2022,
        color: 'White',
        plateNumber: 'TEST-123',
        vehicleType: 'SEDAN',
      })
      .expect(201);
    await http().get(`/vehicles/${car.body._id}`).auth(b.token, { type: 'bearer' }).expect(404);
    await http()
      .patch(`/vehicles/${car.body._id}`)
      .auth(b.token, { type: 'bearer' })
      .send({ brand: 'Changed' })
      .expect(404);
    await http().delete(`/vehicles/${car.body._id}`).auth(b.token, { type: 'bearer' }).expect(404);
    await http().get(`/vehicles/${car.body._id}`).auth(a.token, { type: 'bearer' }).expect(200);
  });
  it('rejects forged, expired and malformed bearer tokens', async () => {
    const a = await account();
    await http()
      .get('/auth/me')
      .auth(a.token.slice(0, -8) + 'tampered', { type: 'bearer' })
      .expect(401);
    const expired = app.get(JwtService).sign({ ver: 0 }, { subject: a.id, expiresIn: -1 });
    await http().get('/auth/me').auth(expired, { type: 'bearer' }).expect(401);
    await http().get('/auth/me').auth('invalid', { type: 'bearer' }).expect(401);
  });
  it('logout revokes other existing sessions without changing the password', async () => {
    const a = await account();
    const before = await model.findById(a.id).select('+password').lean();
    const second = await http()
      .post('/auth/login')
      .send({ email: a.email, password: PASSWORD })
      .expect(200);
    await http().post('/auth/logout').auth(a.token, { type: 'bearer' }).expect(200);
    await http().get('/auth/me').auth(second.body.token, { type: 'bearer' }).expect(401);
    const after = await model.findById(a.id).select('+password').lean();
    expect(after?.password).toBe(before?.password);
    await http().post('/auth/login').send({ email: a.email, password: PASSWORD }).expect(200);
  });
  it('password change requires the current password and invalidates old JWTs', async () => {
    const a = await account();
    await http()
      .post('/auth/change-password')
      .auth(a.token, { type: 'bearer' })
      .send({ currentPassword: 'incorrect', newPassword: PASSWORD + 'new' })
      .expect(400);
    await http()
      .post('/auth/change-password')
      .auth(a.token, { type: 'bearer' })
      .send({ currentPassword: PASSWORD, newPassword: PASSWORD + 'new' })
      .expect(200);
    await http().get('/auth/me').auth(a.token, { type: 'bearer' }).expect(401);
    await http().post('/auth/login').send({ email: a.email, password: PASSWORD }).expect(401);
    await http()
      .post('/auth/login')
      .send({ email: a.email, password: PASSWORD + 'new' })
      .expect(200);
  });
  it('email password reset is single-use and revokes old JWTs', async () => {
    const a = await account();
    await http().post('/auth/forgot-password').send({ email: a.email }).expect(200);
    const otp = codes.get(a.email);
    expect(otp).toMatch(/^\d{6}$/);
    await http()
      .post('/auth/reset-password')
      .send({ email: a.email, otp, newPassword: PASSWORD + 'reset' })
      .expect(200);
    await http().get('/auth/me').auth(a.token, { type: 'bearer' }).expect(401);
    await http()
      .post('/auth/reset-password')
      .send({ email: a.email, otp, newPassword: PASSWORD + 'again' })
      .expect(400);
  });
  it('rejects both SMS recovery endpoints without sending a message', async () => {
    const a = await account();
    for (const route of ['send-otp', 'resend-otp']) {
      await http()
        .post('/auth/' + route)
        .send({ email: a.email, purpose: 'PASSWORD_RESET', channel: 'SMS', phone: '+14155552671' })
        .expect(400);
    }
    expect(sms).not.toHaveBeenCalled();
    await http().post('/auth/login').send({ email: a.email, password: PASSWORD }).expect(200);
  });
  it('one OTP cannot be consumed twice by concurrent server instances', async () => {
    const a = await account();
    const service = app.get(OtpService);
    await service.requestOtp(a.email, OtpPurpose.PASSWORD_RESET);
    const code = codes.get(a.email)!;
    const outcomes = await Promise.allSettled([
      service.verifyOtp(a.email, OtpPurpose.PASSWORD_RESET, code),
      service.verifyOtp(a.email, OtpPurpose.PASSWORD_RESET, code),
    ]);
    expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  });
  it('reserves no more than five concurrent OTP attempts in MongoDB', async () => {
    const a = await account();
    const service = app.get(OtpService);
    await service.requestOtp(a.email, OtpPurpose.PASSWORD_RESET);
    const outcomes = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        service.verifyOtp(a.email, OtpPurpose.PASSWORD_RESET, '000000'),
      ),
    );
    expect(outcomes.every((x) => x.status === 'rejected')).toBe(true);
    const stored = await app.get(getModelToken('Otp')).findOne({ email: a.email }).lean();
    expect(stored.attempts).toBe(5);
  });
  it('shares a ten-attempt login budget atomically and reopens after the minute', async () => {
    const a = await account();
    await model.updateOne(
      { _id: a.id },
      { $set: { loginAttempts: 0 }, $unset: { loginWindowStart: 1 } },
    );
    const attempts = await Promise.all(
      Array.from({ length: 15 }, () => users.consumeLoginAttempt(a.id)),
    );
    expect(attempts.filter(Boolean)).toHaveLength(10);
    await http().post('/auth/login').send({ email: a.email, password: PASSWORD }).expect(429);
    await model.updateOne(
      { _id: a.id },
      { $set: { loginWindowStart: new Date(Date.now() - 61000) } },
    );
    await http().post('/auth/login').send({ email: a.email, password: PASSWORD }).expect(200);
  });
  it('admin alias uses the same account and issues a thirty-minute JWT', async () => {
    const res = await http()
      .post('/auth/login')
      .send({ email: 'admin', password: PASSWORD })
      .expect(200);
    expect(res.body.user.email).toBe('seed-admin@example.com');
    expect(res.body.user.role).toBe(UserRole.ADMIN);
    const payload: { exp: number; iat: number } = app.get(JwtService).decode(res.body.token);
    expect(payload.exp - payload.iat).toBe(1800);
    await http().get('/admin/dashboard').auth(res.body.token, { type: 'bearer' }).expect(200);
  });
  it('startup preserves an existing admin password instead of restoring seed credentials', async () => {
    const admin = await users.findByEmail('seed-admin@example.com');
    await users.updatePassword(admin!._id.toString(), PASSWORD + 'updated');
    await app.get(SeedService).onApplicationBootstrap();
    const reloaded = await users.findByEmail('seed-admin@example.com');
    expect(await users.verifyPassword(reloaded!, PASSWORD + 'updated')).toBe(true);
    expect(await users.verifyPassword(reloaded!, PASSWORD)).toBe(false);
  });
  it('rejects new passwords above the bcrypt byte limit', async () => {
    const a = await account();
    await http()
      .post('/auth/change-password')
      .auth(a.token, { type: 'bearer' })
      .send({ currentPassword: PASSWORD, newPassword: 'ش'.repeat(40) })
      .expect(400);
  });
  it('keeps bookings and notifications private and computes prices on the server', async () => {
    const a = await account();
    const b = await account();
    const car = await http()
      .post('/vehicles')
      .auth(a.token, { type: 'bearer' })
      .send({
        brand: 'Toyota',
        model: 'Fixture',
        year: 2023,
        color: 'White',
        plateNumber: 'SEC-123',
        vehicleType: 'SEDAN',
      })
      .expect(201);
    const catalogue = await http().get('/services').expect(200);
    const svc = catalogue.body[0];
    const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const body = {
      vehicleId: car.body._id,
      services: [{ serviceId: svc._id, addOnIds: [] }],
      date,
      startTime: '09:00',
      location: { country: 'Egypt', city: 'Cairo', address: 'Security fixture street' },
    };
    await http().post('/bookings').auth(b.token, { type: 'bearer' }).send(body).expect(404);
    await http()
      .post('/bookings')
      .auth(a.token, { type: 'bearer' })
      .send({ ...body, total: 0 })
      .expect(400);
    await http()
      .post('/bookings')
      .auth(a.token, { type: 'bearer' })
      .send({ ...body, services: [] })
      .expect(400);
    await http()
      .post('/bookings')
      .auth(a.token, { type: 'bearer' })
      .send({ ...body, location: { ...body.location, latitude: 999 } })
      .expect(400);
    const booking = await http()
      .post('/bookings')
      .auth(a.token, { type: 'bearer' })
      .send(body)
      .expect(201);
    expect(booking.body.total).toBe(svc.basePrice);
    expect(booking.body).not.toHaveProperty('occupiedMinutes');
    await http()
      .get('/bookings/' + booking.body._id)
      .auth(b.token, { type: 'bearer' })
      .expect(404);
    await http()
      .post('/bookings/' + booking.body._id + '/cancel')
      .auth(b.token, { type: 'bearer' })
      .expect(404);
    await http().post('/bookings').auth(a.token, { type: 'bearer' }).send(body).expect(409);
    await http()
      .post('/bookings/' + booking.body._id + '/cancel')
      .auth(a.token, { type: 'bearer' })
      .expect(201);
    const notice = await app.get(NotificationsService).create(a.id, {
      type: NotificationType.BOOKING_STATUS,
      title: 'Fixture',
      message: 'Fixture notice',
      data: {},
    });
    const noticesB = await http()
      .get('/notifications')
      .auth(b.token, { type: 'bearer' })
      .expect(200);
    expect(noticesB.body).toHaveLength(0);
    await http()
      .patch('/notifications/' + notice._id.toString() + '/read')
      .auth(b.token, { type: 'bearer' })
      .expect(404);
    await http()
      .patch('/notifications/' + notice._id.toString() + '/read')
      .auth(a.token, { type: 'bearer' })
      .expect(200);
  });
  it('serializes overlapping creates across independent requests', async () => {
    const a = await account();
    const car = await http()
      .post('/vehicles')
      .auth(a.token, { type: 'bearer' })
      .send({
        brand: 'Toyota',
        model: 'Race fixture',
        year: 2023,
        color: 'White',
        plateNumber: 'RACE-123',
        vehicleType: 'SEDAN',
      })
      .expect(201);
    const catalogue = await http().get('/services').expect(200);
    const svc = catalogue.body[0];
    const date = '2035-06-12';
    const body = {
      vehicleId: car.body._id,
      services: [{ serviceId: svc._id, addOnIds: [] }],
      date,
      startTime: '09:00',
      location: { country: 'Egypt', city: 'Cairo', address: 'Local race fixture street' },
    };
    const bookings = app.get<Model<BookingDocument>>(getModelToken('Booking'));
    await bookings.init();
    const original = bookings.prototype.save;
    let arrived = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = jest.spyOn(bookings.prototype, 'save').mockImplementation(async function (
      this: BookingDocument,
    ) {
      if (this.date === date && this.isNew) {
        if (++arrived === 2) release();
        await barrier;
      }
      return original.call(this);
    });
    try {
      const results = await Promise.all(
        [0, 1].map(() => http().post('/bookings').auth(a.token, { type: 'bearer' }).send(body)),
      );
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(
        await bookings.countDocuments({ date, status: { $ne: BookingStatus.CANCELLED } }),
      ).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });
  it('keeps adjacent slots, releases cancellation, and rejects conflicting admin restoration', async () => {
    const bookings = app.get<Model<BookingDocument>>(getModelToken('Booking'));
    const template = await bookings.findOne({ date: '2035-06-12' }).lean();
    const base = Object.fromEntries(
      Object.entries(template!).filter(
        ([key]) => !['_id', 'createdAt', 'updatedAt', '__v'].includes(key),
      ),
    );
    const first = await bookings.create({
      ...base,
      date: '2035-06-13',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
    });
    const adjacent = await bookings.create({
      ...base,
      date: '2035-06-13',
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
    });
    expect(adjacent.id).not.toBe(first.id);
    await expect(
      bookings.create({
        ...base,
        date: '2035-06-13',
        startTime: '09:30',
        endTime: '10:30',
        duration: 60,
      }),
    ).rejects.toThrow('no longer available');
    first.status = BookingStatus.CANCELLED;
    await first.save();
    const replacement = await bookings.create({
      ...base,
      date: '2035-06-13',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
    });
    const admin = await account(UserRole.ADMIN);
    await http()
      .patch('/admin/bookings/' + first.id + '/status')
      .auth(admin.token, { type: 'bearer' })
      .send({ status: 'CONFIRMED' })
      .expect(409);
    expect((await bookings.findById(first.id))!.status).toBe('CANCELLED');
    replacement.status = BookingStatus.CANCELLED;
    await replacement.save();
    await http()
      .patch('/admin/bookings/' + first.id + '/status')
      .auth(admin.token, { type: 'bearer' })
      .send({ status: 'CONFIRMED' })
      .expect(200);
    expect((await bookings.findById(first.id))!.status).toBe('CONFIRMED');
  });
  it('preserves legacy booking records and checks them before accepting a conflicting booking', async () => {
    const bookings = app.get<Model<BookingDocument>>(getModelToken('Booking'));
    const template = await bookings.findOne({ date: '2035-06-12' }).lean();
    const base = Object.fromEntries(
      Object.entries(template!).filter(
        ([key]) => !['_id', 'createdAt', 'updatedAt', '__v'].includes(key),
      ),
    );
    const legacy = {
      ...base,
      date: '2035-06-14',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
    };
    const inserted = await bookings.collection.insertOne({ ...legacy });
    await expect(
      bookings.create({ ...legacy, startTime: '09:30', endTime: '10:30' }),
    ).rejects.toThrow('no longer available');
    expect(await bookings.collection.findOne({ _id: inserted.insertedId })).not.toHaveProperty(
      'occupiedMinutes',
    );
    const indexes = await bookings.collection.indexes();
    expect(indexes.find((index) => index.name === 'booking_occupied_minutes_unique')?.unique).toBe(
      true,
    );
    const current = await bookings
      .findOne({ date: '2035-06-12' })
      .select('+occupiedMinutes')
      .lean();
    await expect(
      bookings.collection.insertOne({ ...legacy, occupiedMinutes: current!.occupiedMinutes }),
    ).rejects.toMatchObject({ code: 11000 });
  });
  it('reserves the final partial minute of fractional-duration bookings atomically', async () => {
    const bookings = app.get<Model<BookingDocument>>(getModelToken('Booking'));
    const template = await bookings.findOne({ date: '2035-06-12' }).lean();
    const base = Object.fromEntries(
      Object.entries(template!).filter(
        ([key]) => !['_id', 'createdAt', 'updatedAt', '__v'].includes(key),
      ),
    );
    let arrived = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = bookings.exists.bind(bookings);
    const spy = jest.spyOn(bookings, 'exists').mockImplementation((filter) => {
      const query = original(filter);
      if ((filter as unknown as { date?: string })?.date === '2035-06-15') {
        const exec = query.exec.bind(query);
        query.exec = async () => {
          const found = await exec();
          if (++arrived === 2) release();
          await barrier;
          return found;
        };
      }
      return query;
    });
    try {
      const results = await Promise.allSettled([
        bookings.create({
          ...base,
          date: '2035-06-15',
          startTime: '09:00',
          endTime: '09:30.5',
          duration: 30.5,
        }),
        bookings.create({
          ...base,
          date: '2035-06-15',
          startTime: '09:30',
          endTime: '10:00',
          duration: 30,
        }),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejected.reason.getStatus()).toBe(409);
    } finally {
      spy.mockRestore();
    }
  });
  it('allows status-only updates of overlapping legacy records without rewriting their reservations', async () => {
    const bookings = app.get<Model<BookingDocument>>(getModelToken('Booking'));
    const template = await bookings.findOne({ date: '2035-06-12' }).lean();
    const base = Object.fromEntries(
      Object.entries(template!).filter(
        ([key]) => !['_id', 'createdAt', 'updatedAt', '__v'].includes(key),
      ),
    );
    const legacy = {
      ...base,
      date: '2035-06-16',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
    };
    const first = await bookings.collection.insertOne({ ...legacy });
    await bookings.collection.insertOne({ ...legacy, startTime: '09:30', endTime: '10:30' });
    const admin = await account(UserRole.ADMIN);
    const updated = await http()
      .patch('/admin/bookings/' + first.insertedId.toString() + '/status')
      .auth(admin.token, { type: 'bearer' })
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(updated.body).not.toHaveProperty('occupiedMinutes');
    expect(await bookings.collection.findOne({ _id: first.insertedId })).not.toHaveProperty(
      'occupiedMinutes',
    );
  });
  it('omits reservation keys from new, cancelled and restored document JSON', async () => {
    const bookings = app.get<Model<BookingDocument>>(getModelToken('Booking'));
    const stored = await bookings.findOne({ date: '2035-06-12' }).select('+occupiedMinutes');
    expect(stored!.occupiedMinutes?.length).toBeGreaterThan(0);
    expect(stored!.toJSON()).not.toHaveProperty('occupiedMinutes');
    stored!.status = BookingStatus.CANCELLED;
    await stored!.save();
    expect(stored!.toJSON()).not.toHaveProperty('occupiedMinutes');
    stored!.status = BookingStatus.CONFIRMED;
    await stored!.save();
    expect(stored!.toJSON()).not.toHaveProperty('occupiedMinutes');
  });
  it('sends only one email when concurrent requests race the resend cooldown', async () => {
    const a = await account();
    const service = app.get(OtpService);
    const outcomes = await Promise.allSettled(
      Array.from({ length: 6 }, () => service.requestOtp(a.email, OtpPurpose.PASSWORD_RESET)),
    );
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await app.get(getModelToken('Otp')).countDocuments({ email: a.email })).toBe(1);
  });
});
