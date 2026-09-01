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
    register(dto: RegisterDto): unknown;
    login(dto: LoginDto): unknown;
    signToken(id: string, email: string, role: UserRole): string;
    getCurrentUser(userId: string): unknown;
    updateProfile(userId: string, dto: UpdateProfileDto): unknown;
    changePassword(userId: string, dto: ChangePasswordDto): unknown;
    forgotPassword(dto: ForgotPasswordDto): unknown;
    resetPassword(dto: ResetPasswordDto): unknown;
    verifyEmail(email: string, otp: string): unknown;
    resendVerificationOtp(email: string): unknown;
}
