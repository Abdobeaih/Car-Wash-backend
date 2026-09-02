import { UserRole } from '../../common/constants/roles';
import { OtpChannel } from '../../otp/schemas/otp.schema';
export declare class RegisterDto {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    country?: string;
    dialCode?: string;
    phone?: string;
    countryCode?: string;
    verificationChannel?: OtpChannel;
    role?: UserRole;
}
