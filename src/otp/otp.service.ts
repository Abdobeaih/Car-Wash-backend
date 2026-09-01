import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Otp, OtpDocument, OtpPurpose } from './schemas/otp.schema';
import { MailService } from './mail.service';
import { OtpErrorCode, OtpException } from './otp-errors';
import {
  OTP_EXPIRY_MS,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS,
  OTP_RATE_WINDOW_MS,
  OTP_RESEND_COOLDOWN_MS,
} from './otp-config';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    private readonly mailService: MailService,
  ) {}

  async requestOtp(email: string, purpose: OtpPurpose): Promise<void> {
    const normalized = email.toLowerCase();
    const now = Date.now();
    const latest = await this.findLatest(normalized, purpose);

    if (latest && now - latest.lastRequestAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (now - latest.lastRequestAt.getTime())) / 1000,
      );
      throw new OtpException(
        OtpErrorCode.RESEND_TOO_SOON,
        `Please wait ${remaining}s before requesting another code.`,
      );
    }

    if (latest && now - latest.rateWindowStart.getTime() < OTP_RATE_WINDOW_MS) {
      if (latest.requestCount >= OTP_MAX_REQUESTS) {
        throw new OtpException(
          OtpErrorCode.RATE_LIMITED,
          'Too many code requests. Please try again in 10 minutes.',
        );
      }
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(now + OTP_EXPIRY_MS);

    if (latest) {
      latest.used = true;
      await latest.save();
    }

    await this.otpModel.create({
      email: normalized,
      purpose,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
      requestCount: latest && now - latest.rateWindowStart.getTime() < OTP_RATE_WINDOW_MS
        ? latest.requestCount + 1
        : 1,
      rateWindowStart: latest && now - latest.rateWindowStart.getTime() < OTP_RATE_WINDOW_MS
        ? latest.rateWindowStart
        : new Date(now),
      lastRequestAt: new Date(now),
    });

    await this.mailService.sendOtpEmail({
      to: normalized,
      purpose: purpose === OtpPurpose.PASSWORD_RESET ? 'reset' : 'verify',
      otp,
      expiresInMinutes: OTP_EXPIRY_MS / 60000,
    });
  }

  async verifyOtp(email: string, purpose: OtpPurpose, otp: string): Promise<void> {
    const normalized = email.toLowerCase();
    const record = await this.findLatest(normalized, purpose);
    if (!record) {
      throw new OtpException(OtpErrorCode.NOT_FOUND, 'No verification code found for this email.');
    }

    if (record.used) {
      throw new OtpException(
        OtpErrorCode.ALREADY_USED,
        'This code has already been used. Request a new one.',
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new OtpException(
        OtpErrorCode.EXPIRED,
        'This code has expired. Request a new one.',
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new OtpException(
        OtpErrorCode.MAX_ATTEMPTS,
        'Too many incorrect attempts. Request a new code.',
      );
    }

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      record.attempts += 1;
      await record.save();
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        throw new OtpException(
          OtpErrorCode.MAX_ATTEMPTS,
          'Too many incorrect attempts. Request a new code.',
        );
      }
      throw new OtpException(OtpErrorCode.INVALID, 'The code you entered is incorrect.');
    }

    record.used = true;
    record.usedAt = new Date();
    await record.save();
  }

  private findLatest(email: string, purpose: OtpPurpose): Promise<OtpDocument | null> {
    return this.otpModel
      .findOne({ email, purpose })
      .sort({ createdAt: -1 })
      .exec();
  }
}
