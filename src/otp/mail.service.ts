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
  private readonly devLogOtp: boolean;

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

    // Dev fallback: when SMTP_LOG_OTP=true and NODE_ENV !== production, a failed
    // email delivery logs the OTP to the server console instead of failing the
    // whole request. This lets the registration/verification flow be exercised
    // locally without real credentials. It is OFF by default and never active in
    // production, so a broken/missing SMTP still fails there as before.
    this.devLogOtp = this.configService.get<string>('SMTP_LOG_OTP') === 'true';

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

  async sendOtpEmail({
    to,
    purpose,
    otp,
    expiresInMinutes,
  }: OtpEmailPayload): Promise<boolean> {
    const subject = purpose === 'reset' ? 'Reset your password' : 'Verify your email';
    const text = this.buildText(purpose, otp, expiresInMinutes);

    if (!this.transporter) {
      this.logger.warn(
        'SMTP is not configured (SMTP_USER/SMTP_PASS). Email for ' + to + ' was not sent.',
      );
      return this.handleDeliveryFailure('SMTP is not configured', to, otp);
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
    } catch (err) {
      this.logger.error('Unexpected email send failure', err as Error);
      return this.handleDeliveryFailure('email send failed', to, otp);
    }
    return true;
  }

  /**
   * Reports whether the email was actually delivered. Returns `false` when the
   * dev fallback (SMTP_LOG_OTP + non-production) swallowed a failed delivery so
   * the code can be surfaced to the client; throws in every other failure case.
   */
  private handleDeliveryFailure(reason: string, to: string, otp: string): boolean {
    if (this.devLogOtp && process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[dev] Email delivery unavailable (${reason}). OTP for ${to}: ${otp}`);
      return false;
    }
    throw new OtpException(
      OtpErrorCode.EMAIL_SEND_FAILED,
      'Unable to send the verification email. Please try again later.',
    );
  }

  private buildText(purpose: 'verify' | 'reset', otp: string, expiresInMinutes: number): string {
    const intro =
      purpose === 'reset'
        ? 'We received a request to reset your password. Your verification code is:'
        : 'Verify your email to activate your account. Your verification code is:';
    return `${intro}\n\n${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you did not request this code, you can safely ignore this email.`;
  }
}
