"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const otp_service_1 = require("../otp/otp.service");
const otp_schema_1 = require("../otp/schemas/otp.schema");
const roles_1 = require("../common/constants/roles");
let AuthService = class AuthService {
    usersService;
    jwtService;
    otpService;
    constructor(usersService, jwtService, otpService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.otpService = otpService;
    }
    async register(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new common_1.BadRequestException('An account with this email already exists.');
        }
        const role = dto.role === roles_1.UserRole.ADMIN ? roles_1.UserRole.ADMIN : roles_1.UserRole.CUSTOMER;
        if (role === roles_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Admin accounts cannot be created through registration.');
        }
        const channel = dto.verificationChannel ?? otp_schema_1.OtpChannel.EMAIL;
        if (channel === otp_schema_1.OtpChannel.SMS && !dto.phone) {
            throw new common_1.BadRequestException('A phone number is required to receive the code by SMS.');
        }
        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            password: dto.password,
            phone: dto.phone,
            countryCode: dto.countryCode,
            verificationChannel: channel,
            role: roles_1.UserRole.CUSTOMER,
        });
        try {
            await this.otpService.requestOtp(dto.email, otp_schema_1.OtpPurpose.EMAIL_VERIFICATION, channel, channel === otp_schema_1.OtpChannel.SMS ? dto.phone : undefined);
        }
        catch (err) {
            await this.usersService.deleteUser(user._id);
            throw err;
        }
        return {
            user,
            message: channel === otp_schema_1.OtpChannel.SMS
                ? 'Account created. A verification code was sent by SMS. Please verify your account to log in.'
                : 'Account created. A verification code was sent to your email. Please verify your email to log in.',
        };
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        const valid = await this.usersService.verifyPassword(user, dto.password);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        if (!user.emailVerified) {
            throw new common_1.UnauthorizedException('Please verify your email before logging in. Check your inbox for a verification code.');
        }
        return {
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: true,
            },
            token: this.signToken(user._id.toString(), user.email, user.role),
        };
    }
    signToken(id, email, role) {
        return this.jwtService.sign({ email, role }, { subject: id });
    }
    async getCurrentUser(userId) {
        return this.usersService.findById(userId);
    }
    async updateProfile(userId, dto) {
        const current = await this.usersService.findById(userId);
        if (!current) {
            throw new common_1.NotFoundException('User not found.');
        }
        const newEmail = dto.email?.toLowerCase();
        if (newEmail && newEmail !== current.email) {
            const existing = await this.usersService.findByEmail(newEmail);
            if (existing && existing._id.toString() !== userId) {
                throw new common_1.BadRequestException('An account with this email already exists.');
            }
        }
        const updated = await this.usersService.updateProfile(userId, {
            name: dto.name,
            email: dto.email,
        });
        if (!updated) {
            throw new common_1.NotFoundException('User not found.');
        }
        return updated;
    }
    async changePassword(userId, dto) {
        const user = await this.usersService.findByIdWithPassword(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        const valid = await this.usersService.verifyPassword(user, dto.currentPassword);
        if (!valid) {
            throw new common_1.BadRequestException('Current password is incorrect.');
        }
        await this.usersService.updatePassword(userId, dto.newPassword);
        return { message: 'Password changed successfully' };
    }
    async forgotPassword(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            return {
                message: 'If an account exists for this email, a reset code will be provided.',
            };
        }
        await this.otpService.requestOtp(dto.email, otp_schema_1.OtpPurpose.PASSWORD_RESET, otp_schema_1.OtpChannel.EMAIL);
        return {
            message: 'If an account exists for this email, a reset code will be provided.',
        };
    }
    async resetPassword(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.BadRequestException('No active password reset request for this email.');
        }
        await this.otpService.verifyOtp(dto.email, otp_schema_1.OtpPurpose.PASSWORD_RESET, dto.otp);
        await this.usersService.updatePassword(user._id.toString(), dto.newPassword);
        return { message: 'Password reset successfully. You can now log in.' };
    }
    async verifyEmail(email, otp) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        await this.otpService.verifyOtp(email, otp_schema_1.OtpPurpose.EMAIL_VERIFICATION, otp);
        await this.usersService.markEmailVerified(user._id.toString());
        return { message: 'Email verified successfully. You can now log in.' };
    }
    async resendVerificationOtp(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        if (user.emailVerified) {
            throw new common_1.BadRequestException('This email is already verified.');
        }
        const channel = user.verificationChannel ?? otp_schema_1.OtpChannel.EMAIL;
        if (channel === otp_schema_1.OtpChannel.SMS && !user.phone) {
            throw new common_1.BadRequestException('No phone number on file. Please update your profile to receive codes by SMS.');
        }
        await this.otpService.requestOtp(email, otp_schema_1.OtpPurpose.EMAIL_VERIFICATION, channel, channel === otp_schema_1.OtpChannel.SMS ? user.phone : undefined);
        return { message: 'A new verification code has been sent.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        otp_service_1.OtpService])
], AuthService);
//# sourceMappingURL=auth.service.js.map