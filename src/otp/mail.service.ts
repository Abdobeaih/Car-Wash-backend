import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { OtpErrorCode, OtpException } from './otp-errors';

export interface OtpEmailPayload {
  to: string;
  purpose: 'verify' | 'reset';
  otp: string;
  expiresInMinutes: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('GMAIL_USER');
    const pass = this.configService.get<string>('GMAIL_APP_PASSWORD');
    this.from =
      this.configService.get<string>('MAIL_FROM') ?? (user ? `Mobile Car Care <${user}>` : '');

    if (user && pass) {
      const host = this.configService.get<string>('SMTP_HOST') ?? 'smtp.gmail.com';
      const port = Number(this.configService.get<string>('SMTP_PORT') ?? 465);
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
    }
  }

  async sendOtpEmail({ to, purpose, otp, expiresInMinutes }: OtpEmailPayload): Promise<void> {
    const subject = purpose === 'reset' ? 'Reset your password' : 'Verify your email';
    const text = this.buildText(purpose, otp, expiresInMinutes);

    if (!this.transporter) {
      this.logger.warn(`Gmail credentials are not configured. Email for ${to} was not sent.`);
      throw new OtpException(
        OtpErrorCode.EMAIL_SEND_FAILED,
        'Unable to send the verification email. Please try again later.',
      );
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
      });
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
