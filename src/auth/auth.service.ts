import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../common/constants/roles';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const role = dto.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;
    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot be created through registration.');
    }

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: UserRole.CUSTOMER,
    });

    return { user, token: this.signToken(user._id, user.email, user.role) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await this.usersService.verifyPassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
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

  signToken(id: string, email: string, role: UserRole): string {
    return this.jwtService.sign({ email, role }, { subject: id });
  }

  async getCurrentUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const current = await this.usersService.findById(userId);
    if (!current) {
      throw new NotFoundException('User not found.');
    }
    const newEmail = dto.email?.toLowerCase();
    if (newEmail && newEmail !== current.email) {
      const existing = await this.usersService.findByEmail(newEmail);
      if (existing && existing._id.toString() !== userId) {
        throw new BadRequestException('An account with this email already exists.');
      }
    }
    const updated = await this.usersService.updateProfile(userId, {
      name: dto.name,
      email: dto.email,
    });
    if (!updated) {
      throw new NotFoundException('User not found.');
    }
    return updated;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const valid = await this.usersService.verifyPassword(user, dto.currentPassword);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect.');
    }
    await this.usersService.updatePassword(userId, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
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
      message:
        'A password reset code was generated. (No email service is configured, so the code is returned below.)',
      resetToken,
      expiresInMinutes: 60,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      throw new BadRequestException('No active password reset request for this email.');
    }
    if (user.passwordResetExpires.getTime() < Date.now()) {
      throw new BadRequestException(
        'This password reset code has expired. Please request a new one.',
      );
    }
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    if (tokenHash !== user.passwordResetToken) {
      throw new BadRequestException('Invalid password reset code.');
    }
    await this.usersService.updatePassword(user._id.toString(), dto.newPassword);
    await this.usersService.clearPasswordReset(user._id.toString());
    return { message: 'Password reset successfully. You can now log in.' };
  }
}
