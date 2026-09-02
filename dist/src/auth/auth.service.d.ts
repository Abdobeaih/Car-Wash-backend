import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../common/constants/roles';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly otpService;
    constructor(usersService: UsersService, jwtService: JwtService, otpService: OtpService);
    register(dto: RegisterDto): Promise<{
        user: import("../users/users.service").SafeUser;
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            _id: string;
            name: string;
            email: string;
            role: UserRole;
            emailVerified: boolean;
        };
        token: string;
    }>;
    signToken(id: string, email: string, role: UserRole): string;
    getCurrentUser(userId: string): Promise<import("../users/users.service").SafeUser | null>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<import("../users/users.service").SafeUser>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    verifyEmail(email: string, otp: string): Promise<{
        message: string;
    }>;
    resendVerificationOtp(email: string, phone?: string): Promise<{
        message: string;
    }>;
}
