import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { OtpErrorCode, OtpException } from './otp-errors';

export interface OtpEmailPayload {
  to: string;
  purpose: 'verify' | 'reset';
  otp: string;
  expiresInMinutes: number;
}

const DEFAULT_FROM_NAME = 'Mobile Car Care';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: ReturnType<typeof createTransport> | null;
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
