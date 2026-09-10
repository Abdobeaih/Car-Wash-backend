import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { OtpService } from '../src/otp/otp.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { User } from '../src/users/schemas/user.schema';
import { UserRole } from '../src/common/constants/roles';
import { OtpChannel, OtpPurpose } from '../src/otp/schemas/otp.schema';

interface TestUser {
  _id: { toString(): string };
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  role: UserRole;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

describe('Registration & Phone Flow (E2E Integration)', () => {
  let app: INestApplication;

  // In-memory store simulating MongoDB User collection
  const usersDb = new Map<string, TestUser>();
  let nextId = 1;

  const mockUsersService = {
    create: jest.fn(
      async (data: {
        name: string;
        email: string;
        password: string;
        phone?: string;
        countryCode?: string;
        role?: UserRole;
      }) => {
        const id = String(nextId++);
        const user = {
          _id: { toString: () => id },
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          countryCode: data.countryCode,
          role: data.role ?? UserRole.CUSTOMER,
          emailVerified: false,
          password: 'hashed-' + data.password,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersDb.set(id, user);
        usersDb.set(data.email.toLowerCase(), user);
        return {
          _id: id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          countryCode: user.countryCode,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      },
    ),

    findByEmail: jest.fn(async (email: string) => {
      return usersDb.get(email.toLowerCase()) ?? null;
    }),

    findById: jest.fn(async (id: string) => {
      const u = usersDb.get(id);
      if (!u) return null;
      return {
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone,
        countryCode: u.countryCode,
        role: u.role,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    }),

    findByIdWithPassword: jest.fn(async (id: string) => {
      return usersDb.get(id) ?? null;
    }),

    verifyPassword: jest.fn(async (user: TestUser, pass: string) => {
      return user.password === 'hashed-' + pass;
    }),

    markEmailVerified: jest.fn(async (id: string) => {
      const u = usersDb.get(id);
      if (u) {
        u.emailVerified = true;
        u.emailVerifiedAt = new Date();
      }
    }),

    deleteUser: jest.fn(async (id: string) => {
      const u = usersDb.get(id);
      if (u) {
        usersDb.delete(id);
        usersDb.delete(u.email);
      }
    }),

    updateProfile: jest.fn(
      async (id: string, data: { name?: string; email?: string; phone?: string }) => {
        const u = usersDb.get(id);
        if (!u) return null;
        if (data.name !== undefined) u.name = data.name;
        if (data.email !== undefined) u.email = data.email.toLowerCase();
        if (data.phone !== undefined) u.phone = data.phone;
        return {
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          phone: u.phone,
          countryCode: u.countryCode,
          role: u.role,
          emailVerified: u.emailVerified,
        };
      },
    ),
  };

  const mockOtpService = {
    requestOtp: jest.fn().mockResolvedValue(undefined),
    verifyOtp: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: (key: string) =>
      key === 'JWT_SECRET' ? 'test-secret-key-12345678901234567890' : undefined,
  };

  const mockUserModel = {
    findById: (id: string) => ({
      lean: () => ({
        exec: async () => usersDb.get(id) ?? null,
      }),
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret-key-12345678901234567890',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useValue: mockUsersService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    // Exact pipe from src/bootstrap.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    app.get(JwtStrategy);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    usersDb.clear();
    nextId = 1;
    jest.clearAllMocks();
  });

  describe('Full Registration -> Verify -> Login -> /auth/me -> Profile Update Journey', () => {
    it('successfully registers with phone, validates strict DTO, verifies email, logs in, and fetches profile', async () => {
      const registerPayload = {
        name: 'Mahmoud Gamal',
        email: 'mahmoud@example.com',
        country: 'Egypt',
        dialCode: '+20',
        phone: '01012345678',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        countryCode: 'EG',
      };

      // 1. POST /auth/register
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      expect(regRes.body.user).toBeDefined();
      expect(regRes.body.user.name).toBe('Mahmoud Gamal');
      expect(regRes.body.user.email).toBe('mahmoud@example.com');
      // Verify phone normalization: +20 + 01012345678 -> +201012345678
      expect(regRes.body.user.phone).toBe('+201012345678');
      expect(regRes.body.user.countryCode).toBe('EG');
      expect(regRes.body.user.emailVerified).toBe(false);
      expect(mockOtpService.requestOtp).toHaveBeenCalledWith(
        'mahmoud@example.com',
        OtpPurpose.EMAIL_VERIFICATION,
        OtpChannel.EMAIL,
      );

      // 2. Try to login before email verification -> 401 Unauthorized
      const unverifiedLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'mahmoud@example.com', password: 'Password123!' })
        .expect(401);
      expect(unverifiedLogin.body.message).toContain('Please verify your email');

      // 3. Verify Email OTP: POST /auth/verify-email
      const verifyRes = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'mahmoud@example.com', otp: '123456' })
        .expect(200);
      expect(verifyRes.body.message).toContain('Email verified successfully');

      // 4. POST /auth/login after verification
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'mahmoud@example.com', password: 'Password123!' })
        .expect(200);

      expect(loginRes.body.token).toBeDefined();
      expect(loginRes.body.user).toBeDefined();
      expect(loginRes.body.user.phone).toBe('+201012345678');
      expect(loginRes.body.user.countryCode).toBe('EG');
      expect(loginRes.body.user.emailVerified).toBe(true);

      const token = loginRes.body.token;

      // 5. GET /auth/me using Bearer token
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.user).toBeDefined();
      expect(meRes.body.user.name).toBe('Mahmoud Gamal');
      expect(meRes.body.user.email).toBe('mahmoud@example.com');
      expect(meRes.body.user.phone).toBe('+201012345678');
      expect(meRes.body.user.countryCode).toBe('EG');

      // 6. PATCH /auth/me to update phone
      const updateRes = await request(app.getHttpServer())
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+201123456789' })
        .expect(200);

      expect(updateRes.body.phone).toBe('+201123456789');

      // 7. GET /auth/me after update (page refresh simulation)
      const meAfterRefresh = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meAfterRefresh.body.user.phone).toBe('+201123456789');
    });

    it('rejects registration if password and confirmPassword do not match', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          country: 'US',
          dialCode: '+1',
          phone: '4155552671',
          password: 'Password123!',
          confirmPassword: 'MismatchPassword!',
        })
        .expect(400);

      expect(res.body.message).toBe('Passwords do not match.');
    });

    it('rejects registration with forbidden non-whitelisted property', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          unknownField: 'malicious',
        })
        .expect(400);

      expect(res.body.message).toContain('property unknownField should not exist');
    });

    it('rejects registration with invalid phone format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123!',
          phone: 'abc',
        })
        .expect(400);

      expect(res.body.message).toContain('Phone must be a valid international or national number');
    });
  });
});
