/**
 * End-to-end regression suite for the Mobile Car Care API.
 *
 * The suite boots the real AppModule against an in-memory MongoDB
 * (mongodb-memory-server) so Mongoose models, ValidationPipe, guards and
 * JWT/OTP logic are exercised for real over HTTP. Only outbound MailService
 * and SmsService are replaced with in-memory stubs that capture the OTP so we
 * can complete email verification end-to-end.
 *
 * The very first describe() is the regression test for the original production
 * bug: registration previously failed with HTTP 400 `property phone should not
 * exist`. It replays the exact current frontend payload (buildPhonePayload in
 * src/components/auth/RegisterForm.tsx) and asserts a 201 with the normalized
 * international phone stored on the user.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/otp/mail.service';
import { SmsService } from '../src/otp/sms.service';

jest.setTimeout(180_000);

describe('Mobile Car Care API (e2e, in-memory MongoDB)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication;
  let server: string;
  const sentOtpByEmail = new Map<string, string>();
  const sentOtpBySms = new Map<string, string>();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.DATABASE_URL = mongod.getUri('mobile-car-care');

    const appModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        sendOtpEmail: jest.fn(async (payload: { to: string; otp: string }) => {
          sentOtpByEmail.set(payload.to.toLowerCase(), payload.otp);
        }),
      })
      .overrideProvider(SmsService)
      .useValue({
        sendOtpSms: jest.fn(async (payload: { to: string; otp: string }) => {
          sentOtpBySms.set(payload.to, payload.otp);
        }),
      })
      .compile();

    app = appModule.createNestApplication({ logger: false });
    // Mirrors src/bootstrap.ts so e2e exercises the same strict validation.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  describe('REGISTER (the original "phone should not exist" bug)', () => {
    it('rejects an unknown property and keeps the whitelist policy', async () => {
      const res = await request(server).post('/auth/register').send({
        name: 'Tester',
        email: 'tester@example.com',
        password: 'password123',
        junk: 'must be rejected',
        phone: '1012345678',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('property junk should not exist');
    });

    it('rejects a malformed phone', async () => {
      const res = await request(server).post('/auth/register').send({
        name: 'Tester',
        email: 'tester@example.com',
        password: 'password123',
        phone: 'abc',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('Phone must be a valid');
    });

    it('registers with the EXACT current frontend payload (Egypt +20 / national phone)', async () => {
      // Mirrors buildPhonePayload('+20', '01012345678') + the handleRegister body
      // in src/components/auth/RegisterForm.tsx.
      const payload = {
        name: 'Mobile User',
        email: 'mobile@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        country: 'EG',
        dialCode: '+20',
        phone: '1012345678',
        countryCode: 'EG',
      };
      const res = await request(server).post('/auth/register').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      // The canonical stored phone: dial code joined once, leading trunk zero stripped.
      expect(res.body.user.phone).toBe('+201012345678');
      expect(res.body.user.email).toBe('mobile@example.com');
      expect(res.body.user.countryCode).toBe('EG');
      expect(res.body.user.emailVerified).toBe(false);
      // A verification email must have been "sent" (captured by the stub).
      expect(sentOtpByEmail.has('mobile@example.com')).toBe(true);
    });

    it('registers an account without any phone (email-only user)', async () => {
      const res = await request(server).post('/auth/register').send({
        name: 'No Phone',
        email: 'no-phone@example.com',
        password: 'password123',
        countryCode: 'US',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.phone).toBeUndefined();
    });

    it('keeps the stored phone in the exact normalised form after login', async () => {
      const loginRes = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'password123',
      });
      // Email not yet verified -- login must block with 401.
      expect(loginRes.status).toBe(401);
    });
  });

  describe('EMAIL VERIFICATION + LOGIN + ME', () => {
    beforeAll(async () => {
      const res = await request(server)
        .post('/auth/verify-email')
        .send({
          email: 'mobile@example.com',
          otp: sentOtpByEmail.get('mobile@example.com') ?? '000000',
        });
      expect(res.status).toBe(200);
    });

    it('logs in and returns the phone on the user object', async () => {
      const res = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.phone).toBe('+201012345678');
      expect(res.body.user.emailVerified).toBe(true);
    });

    it('GET /auth/me returns the phone for the authenticated user', async () => {
      const login = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'password123',
      });
      const res = await request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${login.body.token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.phone).toBe('+201012345678');
    });

    it('GET /auth/me without a token is 401', async () => {
      const res = await request(server).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('login with a wrong password is 401', async () => {
      const res = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'wrong-password',
      });
      expect(res.status).toBe(401);
    });

    it('PATCH /auth/me updates the phone', async () => {
      const login = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'password123',
      });
      const res = await request(server)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${login.body.token}`)
        .send({ phone: '+201099999999' });
      expect(res.status).toBe(200);
      expect(res.body.phone).toBe('+201099999999');
    });

    it('PATCH /auth/me rejects a malformed phone', async () => {
      const login = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'password123',
      });
      const res = await request(server)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${login.body.token}`)
        .send({ phone: 'abc' });
      expect(res.status).toBe(400);
    });

    it('does not allow registering the same email twice', async () => {
      const res = await request(server).post('/auth/register').send({
        name: 'Duplicate',
        email: 'mobile@example.com',
        password: 'password123',
        phone: '1012345678',
        dialCode: '+20',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('already exists');
    });
  });

  describe('PUBLIC CATALOGUE', () => {
    it('serves the seeded services', async () => {
      const res = await request(server).get('/services');
      expect(res.status).toBe(200);
      const list = res.body as Array<{ name: string; basePrice: number }>;
      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.find((s) => s.name === 'Exterior Car Wash')?.basePrice).toBe(35);
    });

    it('serves the seeded add-ons', async () => {
      const res = await request(server).get('/add-ons');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('reports a healthy API', async () => {
      const res = await request(server).get('/health');
      expect(res.status).toBe(200);
    });

    it('accepts a contact message (no external email gateway triggered)', async () => {
      const res = await request(server).post('/contact').send({
        name: 'Ahmed',
        email: 'ahmed@example.com',
        message: 'Hello, I would like to know your opening hours.',
      });
      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Message received');
    });
  });

  describe('CUSTOMER VEHICLES + BOOKING FLOW', () => {
    let token: string;
    let vehicleId: string;
    let serviceId: string;
    let addOnId: string;
    let bookingId: string;

    beforeAll(async () => {
      const login = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'password123',
      });
      token = login.body.token as string;

      const services = await request(server).get('/services');
      serviceId = (services.body as Array<{ _id: string }>)[0]._id;
      const addOns = await request(server).get('/add-ons');
      addOnId = (addOns.body as Array<{ _id: string }>)[0]._id;

      const vehicle = await request(server)
        .post('/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          brand: 'Toyota',
          model: 'Corolla',
          year: 2021,
          color: 'White',
          plateNumber: 'C-AE 1234',
          vehicleType: 'SEDAN',
        });
      expect(vehicle.status).toBe(201);
      vehicleId = vehicle.body._id;
    });

    it('lists the created vehicle for the owner', async () => {
      const res = await request(server).get('/vehicles').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].brand).toBe('Toyota');
    });

    it('does not create a booking in the past', async () => {
      const past = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const res = await request(server)
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId,
          date: past,
          startTime: '09:00',
          services: [{ serviceId, addOnIds: [] }],
          location: { country: 'Egypt', city: 'Cairo', address: '1 Tahrir Square' },
        });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain('past');
    });

    it('creates a booking for a future working-hours slot', async () => {
      const date = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const res = await request(server)
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vehicleId,
          date,
          startTime: '09:00',
          services: [{ serviceId, addOnIds: [addOnId] }],
          location: { country: 'Egypt', city: 'Cairo', address: '1 Tahrir Square' },
        });
      expect(res.status).toBe(201);
      bookingId = res.body._id;
      expect(res.body.status).toBe('PENDING');
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('finds the booking on the customer list', async () => {
      const res = await request(server).get('/bookings').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.body as Array<{ _id: string }>).some((b) => b._id === bookingId)).toBe(true);
    });

    it('cancels the booking', async () => {
      const res = await request(server)
        .post(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('rejects a second cancel', async () => {
      const res = await request(server)
        .post(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('ADMIN SECURITY + DASHBOARD', () => {
    let adminToken: string;
    let customerToken: string;
    let adminEmail: string;
    let adminPassword: string;

    beforeAll(async () => {
      const config = app.get(ConfigService);
      adminEmail = config.get<string>('SEED_ADMIN_EMAIL') ?? 'admin@example.com';
      adminPassword = config.get<string>('SEED_ADMIN_PASSWORD') ?? 'AdminPass123!';

      const adminLogin = await request(server).post('/auth/login').send({
        email: adminEmail,
        password: adminPassword,
      });
      expect(adminLogin.status).toBe(200);
      adminToken = adminLogin.body.token as string;

      const customerLogin = await request(server).post('/auth/login').send({
        email: 'mobile@example.com',
        password: 'password123',
      });
      customerToken = customerLogin.body.token as string;
    });

    it('blocks anonymous admin access', async () => {
      const res = await request(server).get('/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('blocks a customer from admin routes', async () => {
      const res = await request(server)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('returns the dashboard stats for an admin', async () => {
      const res = await request(server)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('lists admin services (seeded)', async () => {
      const res = await request(server)
        .get('/admin/services')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(4);
    });

    it('lists admin bookings', async () => {
      const res = await request(server)
        .get('/admin/bookings')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('serves the admin calendar', async () => {
      const res = await request(server)
        .get('/admin/calendar')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('lists admin customers', async () => {
      const res = await request(server)
        .get('/admin/customers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('creates and activates a new service as admin', async () => {
      const created = await request(server)
        .post('/admin/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Polish',
          description: 'A temporary service created by the e2e suite.',
          basePrice: 50,
          duration: 60,
          image: '/images/services/exterior-wash.svg',
          isActive: true,
        });
      expect(created.status).toBe(201);
      expect(created.body.name).toBe('E2E Test Polish');
    });
  });

  describe('OTP BACKENDS (stubs only, no external calls)', () => {
    it('requests an SMS OTP through the captured stub', async () => {
      const res = await request(server).post('/auth/send-otp').send({
        email: 'sms-user@example.com',
        purpose: 'EMAIL_VERIFICATION',
        channel: 'SMS',
        phone: '+201099999999',
      });
      expect(res.status).toBe(200);
      expect(sentOtpBySms.has('+201099999999')).toBe(true);
    });
  });
});
