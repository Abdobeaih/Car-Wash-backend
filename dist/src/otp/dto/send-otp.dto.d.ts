import { OtpChannel, OtpPurpose } from '../schemas/otp.schema';
export declare class SendOtpDto {
    email: string;
    purpose: OtpPurpose;
    channel?: OtpChannel;
    phone?: string;
}
