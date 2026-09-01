import { HydratedDocument } from 'mongoose';
export declare enum OtpPurpose {
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
    PASSWORD_RESET = "PASSWORD_RESET"
}
export type OtpDocument = HydratedDocument<Otp>;
export declare class Otp {
    email: string;
    purpose: OtpPurpose;
    otpHash: string;
    expiresAt: Date;
    attempts: number;
    used: boolean;
    requestCount: number;
    rateWindowStart: Date;
    lastRequestAt: Date;
    usedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const OtpSchema: any;
