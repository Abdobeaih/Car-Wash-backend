/**
 * Unit tests for the OTP service.
 */
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { OtpService } from '../src/otp/otp.service';
import { MailService } from '../src/otp/mail.service';
import { Otp, OtpPurpose } from '../src/otp/schemas/otp.schema';
import { OtpErrorCode, OtpException } from '../src/otp/otp-errors';
import { OTP_MAX_ATTEMPTS } from '../src/otp/otp-config';

describe('OtpService', () => {
  let otpService: OtpService;

  const mailService = {
    sendOtpEmail: jest.fn(),
  };

  const makeDoc = (overrides: Record<string, unknown> = {}) => {
    const doc = {
      email: 'test@example.com',
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      otpHash: '',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      used: false,
      requestCount: 1,
      rateWindowStart: new Date(Date.now() - 5 * 1000),
      lastRequestAt: new Date(Date.now() - 5 * 1000),
      save: jest.fn(),
      ...overrides,
    };
    doc.save = jest.fn().mockResolvedValue(doc);
    return doc;
  };

  let otpModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };

  const findOneReturn = { findOne: jest.fn(), sort: jest.fn(), exec: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mailService.sendOtpEmail.mockResolvedValue(undefined);
    findOneReturn.findOne.mockReturnThis();
    findOneReturn.sort.mockReturnThis();
    findOneReturn.exec.mockResolvedValue(null);

    otpModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getModelToken(Otp.name), useValue: otpModel },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    otpService = moduleRef.get(OtpService);
  });

  it('generates a secure hashed OTP and emails it', async () => {
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    });
    otpModel.create.mockImplementation((data) => makeDoc(data));

    await otpService.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION);

    const created = otpModel.create.mock.calls[0][0];
    expect(created.email).toBe('test@example.com');
    expect(created.attempts).toBe(0);
    expect(created.used).toBe(false);
    expect(created.otpHash).toMatch(/^\$2[a-z]\$/);
    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now() + 4.5 * 60 * 1000);

    const emailPayload = mailService.sendOtpEmail.mock.calls[0][0];
    expect(emailPayload.otp).toMatch(/^\d{6}$/);
    expect(emailPayload.to).toBe('test@example.com');
    expect(created.otpHash).not.toBe(emailPayload.otp);
  });

  it('rejects a resend within the 60s cooldown', async () => {
    const existing = makeDoc({ lastRequestAt: new Date(Date.now() - 10 * 1000) });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) }),
    });

    await expect(
      otpService.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION),
    ).rejects.toMatchObject({ code: OtpErrorCode.RESEND_TOO_SOON });
  });

  it('rejects after 3 requests within 10 minutes', async () => {
    const existing = makeDoc({
      requestCount: 3,
      lastRequestAt: new Date(Date.now() - 2 * 60 * 1000),
      rateWindowStart: new Date(Date.now() - 2 * 60 * 1000),
    });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) }),
    });

    await expect(
      otpService.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION),
    ).rejects.toMatchObject({ code: OtpErrorCode.RATE_LIMITED });
  });

  it('invalidates the previous OTP when a new one is requested', async () => {
    const existing = makeDoc({
      requestCount: 1,
      lastRequestAt: new Date(Date.now() - 2 * 60 * 1000),
      rateWindowStart: new Date(Date.now() - 2 * 60 * 1000),
    });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) }),
    });
    otpModel.create.mockImplementation((data) => makeDoc(data));

    await otpService.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION);

    expect(existing.used).toBe(true);
    expect(existing.save).toHaveBeenCalled();
  });

  it('invalidates unexpired OTPs for other purposes when a new one is requested', async () => {
    const pending = makeDoc({
      purpose: OtpPurpose.PASSWORD_RESET,
      lastRequestAt: new Date(Date.now() - 2 * 60 * 1000),
      rateWindowStart: new Date(Date.now() - 2 * 60 * 1000),
    });
    otpModel.findOne
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      })
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(pending) }),
      });
    otpModel.create.mockImplementation((data) => makeDoc(data));

    await otpService.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION);

    expect(otpModel.updateMany).toHaveBeenCalledWith(
      {
        email: 'test@example.com',
        purpose: { $ne: OtpPurpose.EMAIL_VERIFICATION },
        used: false,
        expiresAt: { $gt: expect.any(Date) },
      },
      { $set: { used: true, usedAt: expect.any(Date) } },
    );
  });

  it('rate limits across purposes using the newest record for the email', async () => {
    const resetDoc = makeDoc({
      purpose: OtpPurpose.PASSWORD_RESET,
      requestCount: 3,
      lastRequestAt: new Date(Date.now() - 2 * 60 * 1000),
      rateWindowStart: new Date(Date.now() - 2 * 60 * 1000),
    });
    otpModel.findOne
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      })
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(resetDoc) }),
      });

    await expect(
      otpService.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION),
    ).rejects.toMatchObject({ code: OtpErrorCode.RATE_LIMITED });
  });

  it('verifies a correct OTP and marks it used', async () => {
    const hash = await bcrypt.hash('123456', 10);
    const record = makeDoc({ otpHash: hash });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(record) }),
    });

    await otpService.verifyOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION, '123456');

    expect(record.used).toBe(true);
    expect(record.save).toHaveBeenCalled();
  });

  it('rejects a wrong OTP and increments attempts', async () => {
    const hash = await bcrypt.hash('123456', 10);
    const record = makeDoc({ otpHash: hash, attempts: 2 });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(record) }),
    });

    await expect(
      otpService.verifyOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION, '000000'),
    ).rejects.toMatchObject({ code: OtpErrorCode.INVALID });
    expect(record.attempts).toBe(3);
  });

  it('rejects an expired OTP', async () => {
    const hash = await bcrypt.hash('123456', 10);
    const record = makeDoc({ otpHash: hash, expiresAt: new Date(Date.now() - 1000) });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(record) }),
    });

    await expect(
      otpService.verifyOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION, '123456'),
    ).rejects.toMatchObject({ code: OtpErrorCode.EXPIRED });
  });

  it('rejects an already-used OTP', async () => {
    const hash = await bcrypt.hash('123456', 10);
    const record = makeDoc({ otpHash: hash, used: true });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(record) }),
    });

    await expect(
      otpService.verifyOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION, '123456'),
    ).rejects.toMatchObject({ code: OtpErrorCode.ALREADY_USED });
  });

  it('rejects an OTP after the max attempts limit is reached', async () => {
    const hash = await bcrypt.hash('123456', 10);
    const record = makeDoc({ otpHash: hash, attempts: 5 });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(record) }),
    });

    await expect(
      otpService.verifyOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION, '123456'),
    ).rejects.toMatchObject({ code: OtpErrorCode.MAX_ATTEMPTS });
  });

  it('invalidates the OTP when the max attempts limit is reached', async () => {
    const hash = await bcrypt.hash('123456', 10);
    const record = makeDoc({ otpHash: hash, attempts: OTP_MAX_ATTEMPTS - 1 });
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(record) }),
    });

    await expect(
      otpService.verifyOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION, '000000'),
    ).rejects.toMatchObject({ code: OtpErrorCode.MAX_ATTEMPTS });
    expect(record.used).toBe(true);
    expect(record.save).toHaveBeenCalled();
  });

  it('throws EMAIL_SEND_FAILED when the email cannot be sent', async () => {
    otpModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    });
    otpModel.create.mockImplementation((data) => makeDoc(data));
    mailService.sendOtpEmail.mockRejectedValue(
      new OtpException(OtpErrorCode.EMAIL_SEND_FAILED, 'x'),
    );

    await expect(
      otpService.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION),
    ).rejects.toMatchObject({ code: OtpErrorCode.EMAIL_SEND_FAILED });
  });
});
