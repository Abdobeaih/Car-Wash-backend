import { Model } from 'mongoose';
import { OtpDocument, OtpPurpose } from './schemas/otp.schema';
import { MailService } from './mail.service';
export declare class OtpService {
    private readonly otpModel;
    private readonly mailService;
    constructor(otpModel: Model<OtpDocument>, mailService: MailService);
    requestOtp(email: string, purpose: OtpPurpose): Promise<void>;
    verifyOtp(email: string, purpose: OtpPurpose, otp: string): Promise<void>;
    private findLatest;
    private findLatestGlobal;
}
