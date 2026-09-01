import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
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
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from =
      this.configService.get<string>('MAIL_FROM') ?? 'Mobile Car Care <onboarding@resend.dev>';
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async sendOtpEmail({ to, purpose, otp, expiresInMinutes }: OtpEmailPayload): Promise<void> {
    const subject = purpose === 'reset' ? 'Reset your password' : 'Verify your email';
    const text = this.buildText(purpose, otp, expiresInMinutes);

    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY is not configured. Email for ${to} was not sent.`);
      throw new OtpException(
        OtpErrorCode.EMAIL_SEND_FAILED,
        'Unable to send the verification email. Please try again later.',
      );
    }

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        text,
      });
      if (result.error) {
        this.logger.error(`Resend failed: ${result.error.message}`);
        throw new OtpException(
          OtpErrorCode.EMAIL_SEND_FAILED,
          'Unable to send the verification email. Please try again later.',
        );
      }
    } catch (err) {
      if (err instanceof OtpException) {
        throw err;
      }
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
