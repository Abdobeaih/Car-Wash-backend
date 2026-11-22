import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  Otp,
  OtpChannel,
  OtpDocument,
  OtpPurpose,
  OtpQuota,
  OtpQuotaDocument,
} from './schemas/otp.schema';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';
import { OtpErrorCode, OtpException } from './otp-errors';
import {
  OTP_EXPIRY_MS,
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
    private readonly smsService: SmsService,
    @InjectModel(OtpQuota.name) private readonly quotaModel: Model<OtpQuotaDocument>,
  ) {}

  /**
   * Issues a new OTP for `email`/`purpose` and attempts email delivery.
   * Returns the plaintext OTP only when delivery failed AND the dev fallback
   * (SMTP_LOG_OTP=true, non-production) is active, so the caller can surface it
   * locally. Returns `undefined` when the code was delivered or no fallback ran.
   */
  async requestOtp(
    email: string,
    purpose: OtpPurpose,
    channel: OtpChannel = OtpChannel.EMAIL,
    target?: string,
  ): Promise<string | undefined> {
    const normalized = email.toLowerCase();
    const now = Date.now();

    // Account recovery is email-only. Never send an email-bound reset code to a
    // caller-selected phone, even when an SMS provider has been configured.
    if (channel !== OtpChannel.EMAIL || target) {
      throw new BadRequestException('Account verification and recovery use email only.');
    }
    const deliveryTarget = normalized;

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

    // Rate limit applies to the email address across all purposes: the newest
    // OTP record for the email carries the rolling window counter.
    const rateLatest = await this.findLatestGlobal(normalized);
    const withinRateWindow =
      rateLatest && now - rateLatest.rateWindowStart.getTime() < OTP_RATE_WINDOW_MS;
    if (withinRateWindow && rateLatest.requestCount >= OTP_MAX_REQUESTS) {
      throw new OtpException(
        OtpErrorCode.RATE_LIMITED,
        'Too many code requests. Please try again in 10 minutes.',
      );
    }

    await this.reserveIssueBudget(normalized, now);

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(now + OTP_EXPIRY_MS);

    if (latest) {
      latest.used = true;
      await latest.save();
    }

    // A new OTP invalidates every other unexpired OTP issued for this email
    // (e.g. a password-reset code invalidates a pending verification code).
    await this.otpModel
      .updateMany(
        {
          email: normalized,
          purpose: { $ne: purpose },
          used: false,
          expiresAt: { $gt: new Date(now) },
        },
        { $set: { used: true, usedAt: new Date(now) } },
      )
      .exec();

    await this.otpModel.create({
      email: normalized,
      purpose,
      channel,
      target: deliveryTarget,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
      requestCount: withinRateWindow ? rateLatest.requestCount + 1 : 1,
      rateWindowStart: withinRateWindow ? rateLatest.rateWindowStart : new Date(now),
      lastRequestAt: new Date(now),
    });

    const delivered = await this.mailService.sendOtpEmail({
      to: normalized,
      purpose: purpose === OtpPurpose.PASSWORD_RESET ? 'reset' : 'verify',
      otp,
      expiresInMinutes: OTP_EXPIRY_MS / 60000,
    });
    return delivered ? undefined : otp;
  }

  async verifyOtp(email: string, purpose: OtpPurpose, otp: string): Promise<void> {
    const normalized = email.toLowerCase();
    const record = await this.findLatest(normalized, purpose);
    if (!record || record.channel !== OtpChannel.EMAIL || record.target !== normalized) {
      throw new OtpException(OtpErrorCode.NOT_FOUND, 'No verification code found for this email.');
    }

    if (record.used) {
      throw new OtpException(
        OtpErrorCode.ALREADY_USED,
        'This code has already been used. Request a new one.',
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new OtpException(OtpErrorCode.EXPIRED, 'This code has expired. Request a new one.');
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new OtpException(
        OtpErrorCode.MAX_ATTEMPTS,
        'Too many incorrect attempts. Request a new code.',
      );
    }

    // Reserve an attempt atomically before the expensive comparison. Parallel
    // requests cannot each reuse the same old attempts value.
    const reserved = await this.otpModel
      .findOneAndUpdate(
        {
          _id: record._id,
          channel: OtpChannel.EMAIL,
          target: normalized,
          used: false,
          expiresAt: { $gt: new Date() },
          attempts: { $lt: OTP_MAX_ATTEMPTS },
        },
        { $inc: { attempts: 1 } },
        { new: true },
      )
      .exec();
    if (!reserved) {
      throw new OtpException(OtpErrorCode.MAX_ATTEMPTS, 'Code unavailable. Request a new code.');
    }
    const valid = await bcrypt.compare(otp, reserved.otpHash);
    if (!valid) {
      if (reserved.attempts >= OTP_MAX_ATTEMPTS) {
        throw new OtpException(
          OtpErrorCode.MAX_ATTEMPTS,
          'Too many incorrect attempts. Request a new code.',
        );
      }
      throw new OtpException(OtpErrorCode.INVALID, 'The code you entered is incorrect.');
    }
    // Compare-and-set consumption makes an OTP single-use across concurrent
    // requests and across separate serverless instances.
    const consumed = await this.otpModel
      .updateOne(
        { _id: record._id, used: false, expiresAt: { $gt: new Date() } },
        { $set: { used: true, usedAt: new Date() } },
      )
      .exec();
    if (consumed.modifiedCount !== 1) {
      throw new OtpException(
        OtpErrorCode.ALREADY_USED,
        'This code has already been used. Request a new one.',
      );
    }
  }

  private async reserveIssueBudget(email: string, now: number): Promise<void> {
    const cutoff = new Date(now - OTP_RATE_WINDOW_MS);
    const id = createHash('sha256').update(email).digest('hex');
    try {
      await this.quotaModel
        .findOneAndUpdate(
          {
            _id: id,
            $and: [
              {
                $or: [
                  { lastRequestAt: { $lte: new Date(now - OTP_RESEND_COOLDOWN_MS) } },
                  { lastRequestAt: { $exists: false } },
                ],
              },
              {
                $or: [
                  { windowStart: { $lte: cutoff } },
                  { requestCount: { $lt: OTP_MAX_REQUESTS } },
                  { requestCount: { $exists: false } },
                ],
              },
            ],
          },
          [
            {
              $set: {
                requestCount: {
                  $cond: [
                    { $gt: ['$windowStart', cutoff] },
                    { $add: [{ $ifNull: ['$requestCount', 0] }, 1] },
                    1,
                  ],
                },
                windowStart: {
                  $cond: [{ $gt: ['$windowStart', cutoff] }, '$windowStart', new Date(now)],
                },
                lastRequestAt: new Date(now),
                expiresAt: new Date(now + OTP_RATE_WINDOW_MS),
              },
            },
          ],
          { upsert: true, returnDocument: 'after', updatePipeline: true },
        )
        .exec();
    } catch (error) {
      // A rejected conditional upsert collides with the unique _id. That is a
      // competing request or exhausted budget, never permission to send.
      if ((error as { code?: number }).code === 11000) {
        throw new OtpException(
          OtpErrorCode.RATE_LIMITED,
          'Too many code requests. Please wait before trying again.',
        );
      }
      throw error;
    }
  }

  private findLatest(email: string, purpose: OtpPurpose): Promise<OtpDocument | null> {
    return this.otpModel.findOne({ email, purpose }).sort({ createdAt: -1 }).exec();
  }

  private findLatestGlobal(email: string): Promise<OtpDocument | null> {
    return this.otpModel.findOne({ email }).sort({ createdAt: -1 }).exec();
  }
}
