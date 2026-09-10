import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface OtpEmailPayload {
    to: string;
    purpose: 'verify' | 'reset';
    otp: string;
    expiresInMinutes: number;
}
export declare class MailService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private readonly transporter;
    private readonly from;
    private readonly devLogOtp;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    sendOtpEmail({ to, purpose, otp, expiresInMinutes }: OtpEmailPayload): Promise<void>;
    private handleDeliveryFailure;
    private buildText;
}
