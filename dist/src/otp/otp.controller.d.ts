import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class OtpController {
    private readonly otpService;
    constructor(otpService: OtpService);
    sendOtp(dto: SendOtpDto): unknown;
    verifyOtp(dto: VerifyOtpDto): unknown;
    resendOtp(dto: SendOtpDto): unknown;
}
