import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { OtpService } from '../src/otp/otp.service';
import { MailService } from '../src/otp/mail.service';
import { SmsService } from '../src/otp/sms.service';
import { Otp, OtpChannel, OtpPurpose, OtpQuota } from '../src/otp/schemas/otp.schema';
import { OTP_MAX_ATTEMPTS } from '../src/otp/otp-config';

const query = (value: unknown) => ({
  sort: () => ({ exec: async () => value }),
  exec: async () => value,
});
describe('OtpService security', () => {
  let service: OtpService;
  let model: Record<
    'findOne' | 'create' | 'updateMany' | 'updateOne' | 'findOneAndUpdate',
    jest.Mock
  >;
  let mail: { sendOtpEmail: jest.Mock };
  let sms: { sendOtpSms: jest.Mock };
  const record = (overrides = {}) => ({
    _id: 'otp-1',
    email: 'test@example.com',
    target: 'test@example.com',
    channel: OtpChannel.EMAIL,
    purpose: OtpPurpose.PASSWORD_RESET,
    expiresAt: new Date(Date.now() + 300000),
    attempts: 0,
    used: false,
    lastRequestAt: new Date(Date.now() - 120000),
    rateWindowStart: new Date(Date.now() - 120000),
    requestCount: 1,
    save: jest.fn(),
    ...overrides,
  });
  beforeEach(async () => {
    model = {
      findOne: jest.fn(() => query(null)),
      create: jest.fn(),
      updateMany: jest.fn(() => query({})),
      updateOne: jest.fn(() => query({ modifiedCount: 1 })),
      findOneAndUpdate: jest.fn(),
    };
    mail = { sendOtpEmail: jest.fn().mockResolvedValue(true) };
    sms = { sendOtpSms: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getModelToken(Otp.name), useValue: model },
        {
          provide: getModelToken(OtpQuota.name),
          useValue: { findOneAndUpdate: jest.fn(() => query({})) },
        },
        { provide: MailService, useValue: mail },
        { provide: SmsService, useValue: sms },
      ],
    }).compile();
    service = module.get(OtpService);
  });
  it('hashes random six-digit email codes, never returns a delivered code', async () => {
    await expect(
      service.requestOtp('TEST@example.com', OtpPurpose.PASSWORD_RESET),
    ).resolves.toBeUndefined();
    const stored = model.create.mock.calls[0][0];
    const sent = mail.sendOtpEmail.mock.calls[0][0];
    expect(stored.target).toBe('test@example.com');
    expect(sent.otp).toMatch(/^\d{6}$/);
    expect(stored.otpHash).not.toBe(sent.otp);
    expect(await bcrypt.compare(sent.otp, stored.otpHash)).toBe(true);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 240000);
  });
  it.each([OtpPurpose.PASSWORD_RESET, OtpPurpose.EMAIL_VERIFICATION])(
    'rejects caller-selected SMS delivery for %s before storage/delivery',
    async (purpose) => {
      await expect(
        service.requestOtp('test@example.com', purpose, OtpChannel.SMS, '+14155552671'),
      ).rejects.toThrow('email only');
      expect(model.create).not.toHaveBeenCalled();
      expect(sms.sendOtpSms).not.toHaveBeenCalled();
    },
  );
  it('rejects a phone target even if channel is labelled EMAIL', async () => {
    await expect(
      service.requestOtp(
        'test@example.com',
        OtpPurpose.PASSWORD_RESET,
        OtpChannel.EMAIL,
        '+14155552671',
      ),
    ).rejects.toThrow('email only');
  });
  it('enforces the resend cooldown', async () => {
    model.findOne.mockReturnValue(query(record({ lastRequestAt: new Date() })));
    await expect(
      service.requestOtp('test@example.com', OtpPurpose.PASSWORD_RESET),
    ).rejects.toMatchObject({ code: 'OTP_RESEND_TOO_SOON' });
  });
  it('limits send volume across purposes', async () => {
    model.findOne
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(record({ requestCount: 3 })));
    await expect(
      service.requestOtp('test@example.com', OtpPurpose.EMAIL_VERIFICATION),
    ).rejects.toMatchObject({ code: 'OTP_RATE_LIMITED' });
  });
  it('invalidates old codes when resending', async () => {
    const previous = record();
    model.findOne.mockReturnValue(query(previous));
    await service.requestOtp('test@example.com', OtpPurpose.PASSWORD_RESET);
    expect(previous.used).toBe(true);
    expect(previous.save).toHaveBeenCalled();
    expect(model.updateMany).toHaveBeenCalled();
  });
  it('propagates delivery failure', async () => {
    mail.sendOtpEmail.mockRejectedValue(new Error('delivery failure'));
    await expect(service.requestOtp('test@example.com', OtpPurpose.PASSWORD_RESET)).rejects.toThrow(
      'delivery failure',
    );
  });
  it.each([
    ['OTP_NOT_FOUND', null],
    ['OTP_ALREADY_USED', record({ used: true })],
    ['OTP_EXPIRED', record({ expiresAt: new Date(0) })],
    ['OTP_MAX_ATTEMPTS', record({ attempts: OTP_MAX_ATTEMPTS })],
    ['OTP_NOT_FOUND', record({ channel: OtpChannel.SMS, target: '+14155552671' })],
  ])('rejects unavailable codes: %s', async (code, doc) => {
    model.findOne.mockReturnValue(query(doc));
    await expect(
      service.verifyOtp('test@example.com', OtpPurpose.PASSWORD_RESET, '123456'),
    ).rejects.toMatchObject({ code });
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('reserves a database attempt before comparing and consumes success atomically', async () => {
    const doc = record({ otpHash: await bcrypt.hash('123456', 4) });
    model.findOne.mockReturnValue(query(doc));
    model.findOneAndUpdate.mockReturnValue(query({ ...doc, attempts: 1 }));
    await service.verifyOtp('test@example.com', OtpPurpose.PASSWORD_RESET, '123456');
    expect(model.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      attempts: { $lt: OTP_MAX_ATTEMPTS },
      used: false,
      channel: OtpChannel.EMAIL,
    });
    expect(model.updateOne.mock.calls[0][0]).toMatchObject({ used: false });
  });
  it('rejects a racing request that cannot reserve an attempt', async () => {
    model.findOne.mockReturnValue(query(record()));
    model.findOneAndUpdate.mockReturnValue(query(null));
    await expect(
      service.verifyOtp('test@example.com', OtpPurpose.PASSWORD_RESET, '123456'),
    ).rejects.toMatchObject({ code: 'OTP_MAX_ATTEMPTS' });
  });
  it('rejects a code consumed by a concurrent verifier', async () => {
    const doc = record({ otpHash: await bcrypt.hash('123456', 4) });
    model.findOne.mockReturnValue(query(doc));
    model.findOneAndUpdate.mockReturnValue(query({ ...doc, attempts: 1 }));
    model.updateOne.mockReturnValue(query({ modifiedCount: 0 }));
    await expect(
      service.verifyOtp('test@example.com', OtpPurpose.PASSWORD_RESET, '123456'),
    ).rejects.toMatchObject({ code: 'OTP_ALREADY_USED' });
  });
  it.each([
    [2, 'OTP_INVALID'],
    [OTP_MAX_ATTEMPTS, 'OTP_MAX_ATTEMPTS'],
  ])('counts a wrong code at attempt %s', async (attempts, code) => {
    const doc = record({ otpHash: await bcrypt.hash('123456', 4) });
    model.findOne.mockReturnValue(query(doc));
    model.findOneAndUpdate.mockReturnValue(query({ ...doc, attempts }));
    await expect(
      service.verifyOtp('test@example.com', OtpPurpose.PASSWORD_RESET, '000000'),
    ).rejects.toMatchObject({ code });
    expect(model.updateOne).not.toHaveBeenCalled();
  });
});
