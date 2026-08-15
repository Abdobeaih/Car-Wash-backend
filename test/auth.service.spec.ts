/**
 * Unit tests for the auth service (login validation is exercised at the API level).
 */
import { Test } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../src/common/constants/roles';

describe('AuthService', () => {
  let authService: AuthService;

  const userRecord = {
    _id: { toString: () => 'user-1' },
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.CUSTOMER,
    password: 'hashed-password',
  };

  const usersService = {
    findByEmail: jest.fn(),
    verifyPassword: jest.fn(),
    findById: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(() => 'signed-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it('logs in with valid credentials', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);
    usersService.verifyPassword.mockResolvedValue(true);

    const result = await authService.login({ email: 'test@example.com', password: 'password123' });
    expect(result.token).toBe('signed-token');
    expect(result.user.role).toBe(UserRole.CUSTOMER);
  });

  it('rejects invalid credentials', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);
    usersService.verifyPassword.mockResolvedValue(false);

    await expect(
      authService.login({ email: 'test@example.com', password: 'wrongpassword' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'nobody@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
