import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { OtpErrorCode, OtpException } from './otp-errors';

export interface OtpEmailPayload {
  to: string;
  purpose: 'verify' | 'reset';
  otp: string;
  expiresInMinutes: number;
}

const DEFAULT_FROM_NAME = 'Mobile Car Care';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') ?? 'smtp.gmail.com';
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 465);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    // Gmail SMTP only accepts a From address owned by the authenticated account,
    // so the default sender is derived from SMTP_USER unless MAIL_FROM overrides it.
    this.from =
      this.configService.get<string>('MAIL_FROM') ??
      (user ? `${DEFAULT_FROM_NAME} <${user}>` : DEFAULT_FROM_NAME);

    this.transporter =
      user && pass
        ? createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          })
        : null;
  }

  /**
   * Verifies the SMTP connection at startup so misconfiguration is surfaced early
   * (e.g. an invalid Gmail App Password). The failure is logged, never thrown:
   * the API must still boot so an unrelated restart does not take the app down.
   */
  async onModuleInit(): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        'SMTP is not configured (SMTP_USER/SMTP_PASS missing). OTP emails will not be sent.',
      );
      return;
    }
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully.');
    } catch (err) {
      this.logger.error(
        'SMTP connection verification failed. Check SMTP_USER/SMTP_PASS (Gmail requires an App Password).',
        err as Error,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.transporter) {
      await this.transporter.close();
    }
  }

  async sendOtpEmail({ to, purpose, otp, expiresInMinutes }: OtpEmailPayload): Promise<void> {
    const subject = purpose === 'reset' ? 'Reset your password' : 'Verify your email';
    const text = this.buildText(purpose, otp, expiresInMinutes);

    if (!this.transporter) {
      this.logger.warn(
        'SMTP is not configured (SMTP_USER/SMTP_PASS). Email for ' + to + ' was not sent.',
      );
      throw new OtpException(
        OtpErrorCode.EMAIL_SEND_FAILED,
        'Unable to send the verification email. Please try again later.',
      );
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
    } catch (err) {
      this.logger.error('Unexpected email send failure', err as Error);
      throw new OtpException(
        OtpErrorCode.EMAIL_SEND_FAILED,
        'Unable to send the verification email. Please try again later.',
      );
    }
  }

  private buildText(purpose: 'verify' | 'reset', otp: string, expiresInMinutes: number): string {
    const intro =
      purpose === 'reset'
        ? 'We received a request to reset your password. Your verification code is:'
        : 'Verify your email to activate your account. Your verification code is:';
    return `${intro}\n\n${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you did not request this code, you can safely ignore this email.`;
  }
}
