/**
 * Unit tests for the auth service.
 */
import { Test } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { OtpService } from '../src/otp/otp.service';
import { OtpPurpose } from '../src/otp/schemas/otp.schema';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../src/common/constants/roles';
import { OtpChannel } from '../src/otp/schemas/otp.schema';

describe('AuthService', () => {
  let authService: AuthService;

  const userRecord = {
    _id: { toString: () => 'user-1' },
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.CUSTOMER,
    emailVerified: true,
    password: 'hashed-password',
  };

  const usersService = {
    findByEmail: jest.fn(),
    verifyPassword: jest.fn(),
    findById: jest.fn(),
    findByIdWithPassword: jest.fn(),
    create: jest.fn(),
    updatePassword: jest.fn(),
    markEmailVerified: jest.fn(),
    deleteUser: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(() => 'signed-token'),
  };

  const otpService = {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    jwtService.sign.mockReturnValue('signed-token');
    otpService.requestOtp.mockResolvedValue(undefined);
    otpService.verifyOtp.mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: OtpService, useValue: otpService },
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

  it('rejects login for an unverified email', async () => {
    usersService.findByEmail.mockResolvedValue({ ...userRecord, emailVerified: false });
    usersService.verifyPassword.mockResolvedValue(true);

    await expect(
      authService.login({ email: 'test@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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

  it('registers a new user and sends an email verification OTP', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'user-1', email: 'new@example.com' });

    const result = await authService.register({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
    });

    expect(otpService.requestOtp).toHaveBeenCalledWith(
      'new@example.com',
      OtpPurpose.EMAIL_VERIFICATION,
      OtpChannel.EMAIL,
    );
    expect(result).not.toHaveProperty('token');
  });

  it('registers with a phone but always verifies via email (no SMS OTP)', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'user-1', email: 'new@example.com' });

    const result = await authService.register({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      phone: '+14155552671',
      countryCode: 'US',
      verificationChannel: OtpChannel.SMS,
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+14155552671',
        countryCode: 'US',
        verificationChannel: OtpChannel.EMAIL,
      }),
    );
    // OTP is delivered by email only, never via SMS.
    expect(otpService.requestOtp).toHaveBeenCalledWith(
      'new@example.com',
      OtpPurpose.EMAIL_VERIFICATION,
      OtpChannel.EMAIL,
    );
    expect(otpService.requestOtp).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      OtpChannel.SMS,
      expect.anything(),
    );
    expect(result.message).toContain('email');
  });

  it('registers without a phone and still verifies via email', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'user-1', email: 'new@example.com' });

    const result = await authService.register({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      verificationChannel: OtpChannel.SMS,
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ verificationChannel: OtpChannel.EMAIL }),
    );
    expect(otpService.requestOtp).toHaveBeenCalledWith(
      'new@example.com',
      OtpPurpose.EMAIL_VERIFICATION,
      OtpChannel.EMAIL,
    );
    expect(result.message).toContain('email');
  });

  it('combines dialCode + phone into one normalized number (no duplicate +)', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'user-1', email: 'new@example.com' });

    await authService.register({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      country: 'Egypt',
      dialCode: '+20',
      phone: '201234567890',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+20201234567890',
        countryCode: 'EG',
      }),
    );
    expect(otpService.requestOtp).toHaveBeenCalledWith(
      'new@example.com',
      OtpPurpose.EMAIL_VERIFICATION,
      OtpChannel.EMAIL,
    );
  });

  it('never passes the phone when EMAIL channel is used', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'user-1', email: 'new@example.com' });

    await authService.register({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      country: 'US',
      dialCode: '1',
      phone: '4155552671',
    });

    const createArg = usersService.create.mock.calls[0][0];
    expect(createArg.phone).toBe('+14155552671');
    expect(createArg).not.toHaveProperty('confirmPassword');
    expect(otpService.requestOtp).toHaveBeenCalledWith(
      'new@example.com',
      OtpPurpose.EMAIL_VERIFICATION,
      OtpChannel.EMAIL,
    );
  });

  it('rejects registration when confirmPassword does not match password', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        confirmPassword: 'different123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('rolls back the user when the OTP email fails to send', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'user-1', email: 'new@example.com' });
    otpService.requestOtp.mockRejectedValue(new Error('EMAIL_SEND_FAILED'));

    await expect(
      authService.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('EMAIL_SEND_FAILED');
    expect(usersService.deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('verifies the email and marks the user verified', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);

    const result = await authService.verifyEmail('test@example.com', '123456');

    expect(otpService.verifyOtp).toHaveBeenCalledWith(
      'test@example.com',
      OtpPurpose.EMAIL_VERIFICATION,
      '123456',
    );
    expect(usersService.markEmailVerified).toHaveBeenCalledWith('user-1');
    expect(result.message).toContain('verified');
  });

  it('rejects email verification for an unknown user', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(authService.verifyEmail('nobody@example.com', '123456')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forgot-password sends a reset OTP without leaking a token', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);

    const result = await authService.forgotPassword({ email: 'test@example.com' });

    expect(otpService.requestOtp).toHaveBeenCalledWith(
      'test@example.com',
      OtpPurpose.PASSWORD_RESET,
      OtpChannel.EMAIL,
    );
    expect(result).not.toHaveProperty('resetToken');
  });

  it('reset-password verifies the OTP before updating the password', async () => {
    usersService.findByEmail.mockResolvedValue(userRecord);

    await authService.resetPassword({
      email: 'test@example.com',
      otp: '123456',
      newPassword: 'newpassword123',
    });

    expect(otpService.verifyOtp).toHaveBeenCalledWith(
      'test@example.com',
      OtpPurpose.PASSWORD_RESET,
      '123456',
    );
    expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', 'newpassword123');
  });
});
