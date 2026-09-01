import { HttpException, HttpStatus } from '@nestjs/common';

export enum OtpErrorCode {
  NOT_FOUND = 'OTP_NOT_FOUND',
  INVALID = 'OTP_INVALID',
  EXPIRED = 'OTP_EXPIRED',
  ALREADY_USED = 'OTP_ALREADY_USED',
  MAX_ATTEMPTS = 'OTP_MAX_ATTEMPTS',
  RESEND_TOO_SOON = 'OTP_RESEND_TOO_SOON',
  RATE_LIMITED = 'OTP_RATE_LIMITED',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
}

export class OtpException extends HttpException {
  constructor(
    readonly code: OtpErrorCode,
    message: string,
  ) {
    super({ statusCode: HttpStatus.BAD_REQUEST, message, otpCode: code }, HttpStatus.BAD_REQUEST);
  }
}
