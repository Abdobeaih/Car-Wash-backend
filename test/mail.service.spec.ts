/**
 * Unit tests for the Gmail SMTP mail service.
 */
import { ConfigService } from '@nestjs/config';
import { MailService } from '../src/otp/mail.service';
import { OtpErrorCode } from '../src/otp/otp-errors';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
}));

import * as nodemailer from 'nodemailer';

describe('MailService', () => {
  let mailService: MailService;
  let sendMail: jest.Mock;

  const makeConfig = (overrides: Record<string, string> = {}) =>
    ({
      get: (key: string) =>
        ({
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: '465',
          SMTP_USER: 'freelancer360.dev@gmail.com',
          SMTP_PASS: 'secret',
          MAIL_FROM: 'Mobile Car Care <freelancer360.dev@gmail.com>',
          ...overrides,
        })[key],
    }) as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    mailService = new MailService(makeConfig());
    const createTransport = nodemailer.createTransport as jest.Mock;
    const results = createTransport.mock.results;
    sendMail = results[results.length - 1].value.sendMail;
    sendMail.mockResolvedValue(undefined);
  });

  it('configures a Gmail SMTP transporter from env', () => {
    const createTransport = nodemailer.createTransport as jest.Mock;
    const options = createTransport.mock.calls[createTransport.mock.calls.length - 1][0];
    expect(options.host).toBe('smtp.gmail.com');
    expect(options.port).toBe(465);
    expect(options.secure).toBe(true);
    expect(options.auth.user).toBe('freelancer360.dev@gmail.com');
    expect(options.auth.pass).toBe('secret');
  });

  it('sends the verification code to the recipient', async () => {
    await mailService.sendOtpEmail({
      to: 'new@example.com',
      purpose: 'verify',
      otp: '123456',
      expiresInMinutes: 10,
    });

    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('new@example.com');
    expect(mail.from).toBe('Mobile Car Care <freelancer360.dev@gmail.com>');
    expect(mail.subject).toBe('Verify your email');
    expect(mail.text).toContain('123456');
    expect(mail.text).toContain('10 minutes');
  });

  it('uses the reset subject when sending a password reset code', async () => {
    await mailService.sendOtpEmail({
      to: 'new@example.com',
      purpose: 'reset',
      otp: '111111',
      expiresInMinutes: 10,
    });

    expect(sendMail.mock.calls[0][0].subject).toBe('Reset your password');
  });

  it('maps a transport failure to EMAIL_SEND_FAILED', async () => {
    sendMail.mockRejectedValue(new Error('SMTP 535: authentication failed'));

    await expect(
      mailService.sendOtpEmail({
        to: 'new@example.com',
        purpose: 'verify',
        otp: '123456',
        expiresInMinutes: 10,
      }),
    ).rejects.toMatchObject({ code: OtpErrorCode.EMAIL_SEND_FAILED });
  });

  it('fails with EMAIL_SEND_FAILED when SMTP credentials are missing', async () => {
    mailService = new MailService(makeConfig({ SMTP_PASS: '' }));

    const createTransport = nodemailer.createTransport as jest.Mock;
    const countsAfterConfigured = createTransport.mock.calls.length;

    await expect(
      mailService.sendOtpEmail({
        to: 'new@example.com',
        purpose: 'verify',
        otp: '123456',
        expiresInMinutes: 10,
      }),
    ).rejects.toMatchObject({ code: OtpErrorCode.EMAIL_SEND_FAILED });

    expect(createTransport.mock.calls.length).toBe(countsAfterConfigured);
  });

  it('logs the OTP instead of failing when SMTP_LOG_OTP is enabled in dev', async () => {
    mailService = new MailService(makeConfig({ SMTP_PASS: '', SMTP_LOG_OTP: 'true' }));
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      await mailService.sendOtpEmail({
        to: 'dev@example.com',
        purpose: 'verify',
        otp: '654321',
        expiresInMinutes: 10,
      });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});
