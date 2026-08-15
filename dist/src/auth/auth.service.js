"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto = __importStar(require("crypto"));
const users_service_1 = require("../users/users.service");
const roles_1 = require("../common/constants/roles");
let AuthService = class AuthService {
    usersService;
    jwtService;
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
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
        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            password: dto.password,
            role: roles_1.UserRole.CUSTOMER,
        });
        return { user, token: this.signToken(user._id, user.email, user.role) };
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
        return {
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
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
                resetToken: null,
            };
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await this.usersService.setPasswordReset(user._id.toString(), tokenHash, expires);
        return {
            message: 'A password reset code was generated. (No email service is configured, so the code is returned below.)',
            resetToken,
            expiresInMinutes: 60,
        };
    }
    async resetPassword(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
            throw new common_1.BadRequestException('No active password reset request for this email.');
        }
        if (user.passwordResetExpires.getTime() < Date.now()) {
            throw new common_1.BadRequestException('This password reset code has expired. Please request a new one.');
        }
        const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
        if (tokenHash !== user.passwordResetToken) {
            throw new common_1.BadRequestException('Invalid password reset code.');
        }
        await this.usersService.updatePassword(user._id.toString(), dto.newPassword);
        await this.usersService.clearPasswordReset(user._id.toString());
        return { message: 'Password reset successfully. You can now log in.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map