import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { OtpErrorCode, OtpException } from './otp-errors';

export interface OtpSmsPayload {
  to: string;
  otp: string;
  expiresInMinutes: number;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: ReturnType<typeof twilio> | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (accountSid && authToken && from) {
      this.client = twilio(accountSid, authToken);
      this.from = from;
    } else {
      this.client = null;
      this.from = '';
    }
  }

  async sendOtpSms({ to, otp, expiresInMinutes }: OtpSmsPayload): Promise<void> {
    if (!this.client) {
      this.logger.warn('Twilio is not configured. SMS for ' + to + ' was not sent.');
      throw new OtpException(
        OtpErrorCode.SMS_SEND_FAILED,
        'Unable to send the verification code by SMS. Please try again later.',
      );
    }

    const body =
      'Your Mobile Car Care verification code is ' +
      otp +
      '. It expires in ' +
      expiresInMinutes +
      ' minutes. If you did not request this code, you can safely ignore this message.';

    try {
      await this.client.messages.create({ to, from: this.from, body });
    } catch (err) {
      this.logger.error('Unexpected SMS send failure', err as Error);
      throw new OtpException(
        OtpErrorCode.SMS_SEND_FAILED,
        'Unable to send the verification code by SMS. Please try again later.',
      );
    }
  }
}
