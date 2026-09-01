import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpChannel } from './schemas/otp.schema';

@Controller('auth')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.otpService.requestOtp(
      dto.email,
      dto.purpose,
      dto.channel ?? OtpChannel.EMAIL,
      dto.phone,
    );
    return { message: 'Verification code sent.' };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.email, dto.purpose, dto.otp);
    return { message: 'Verification successful.' };
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: SendOtpDto) {
    await this.otpService.requestOtp(
      dto.email,
      dto.purpose,
      dto.channel ?? OtpChannel.EMAIL,
      dto.phone,
    );
    return { message: 'A new verification code has been sent.' };
  }
}
