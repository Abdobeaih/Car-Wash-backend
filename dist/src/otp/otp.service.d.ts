import { Model } from 'mongoose';
import { OtpChannel, OtpDocument, OtpPurpose } from './schemas/otp.schema';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';
export declare class OtpService {
    private readonly otpModel;
    private readonly mailService;
    private readonly smsService;
    constructor(otpModel: Model<OtpDocument>, mailService: MailService, smsService: SmsService);
    requestOtp(email: string, purpose: OtpPurpose, channel?: OtpChannel, target?: string): Promise<string | undefined>;
    verifyOtp(email: string, purpose: OtpPurpose, otp: string): Promise<void>;
    private findLatest;
    private findLatestGlobal;
}
