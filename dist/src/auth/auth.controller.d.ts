import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RequestUser } from '../common/interfaces/request-user.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): unknown;
    verifyEmail(dto: VerifyEmailDto): unknown;
    resendVerification(dto: ResendVerificationDto): unknown;
    login(dto: LoginDto): unknown;
    logout(user: RequestUser): {
        message: string;
        userId: string;
    };
    me(user: RequestUser): unknown;
    updateProfile(user: RequestUser, dto: UpdateProfileDto): unknown;
    changePassword(user: RequestUser, dto: ChangePasswordDto): unknown;
    forgotPassword(dto: ForgotPasswordDto): unknown;
    resetPassword(dto: ResetPasswordDto): unknown;
}
