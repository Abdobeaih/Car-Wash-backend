import { OtpPurpose } from '../schemas/otp.schema';
export declare class VerifyOtpDto {
    email: string;
    purpose: OtpPurpose;
    otp: string;
}
