import { ConfigService } from '@nestjs/config';
export interface OtpEmailPayload {
    to: string;
    purpose: 'verify' | 'reset';
    otp: string;
    expiresInMinutes: number;
}
export declare class MailService {
    private readonly configService;
    private readonly logger;
    private readonly resend;
    private readonly from;
    constructor(configService: ConfigService);
    sendOtpEmail({ to, purpose, otp, expiresInMinutes }: OtpEmailPayload): Promise<void>;
    private buildText;
}
