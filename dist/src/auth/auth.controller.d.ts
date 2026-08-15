import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestUser } from '../common/interfaces/request-user.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        user: import("../users/users.service").SafeUser;
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            _id: string;
            name: string;
            email: string;
            role: import("../common/constants/roles").UserRole;
        };
        token: string;
    }>;
    logout(user: RequestUser): {
        message: string;
        userId: string;
    };
    me(user: RequestUser): Promise<{
        user: null;
    } | {
        user: import("../users/users.service").SafeUser;
    }>;
    updateProfile(user: RequestUser, dto: UpdateProfileDto): Promise<import("../users/users.service").SafeUser>;
    changePassword(user: RequestUser, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        resetToken: null;
        expiresInMinutes?: undefined;
    } | {
        message: string;
        resetToken: string;
        expiresInMinutes: number;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
