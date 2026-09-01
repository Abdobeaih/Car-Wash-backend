import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { OtpChannel, OtpPurpose } from '../otp/schemas/otp.schema';
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
    private readonly otpService: OtpService,
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

    const channel = dto.verificationChannel ?? OtpChannel.EMAIL;
    if (channel === OtpChannel.SMS && !dto.phone) {
      throw new BadRequestException('A phone number is required to receive the code by SMS.');
    }

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      countryCode: dto.countryCode,
      verificationChannel: channel,
      role: UserRole.CUSTOMER,
    });

    try {
      await this.otpService.requestOtp(
        dto.email,
        OtpPurpose.EMAIL_VERIFICATION,
        channel,
        channel === OtpChannel.SMS ? dto.phone : undefined,
      );
    } catch (err) {
      await this.usersService.deleteUser(user._id);
      throw err;
    }

    return {
      user,
      message:
        channel === OtpChannel.SMS
          ? 'Account created. A verification code was sent by SMS. Please verify your account to log in.'
          : 'Account created. A verification code was sent to your email. Please verify your email to log in.',
    };
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

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox for a verification code.',
      );
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
      };
    }
    await this.otpService.requestOtp(dto.email, OtpPurpose.PASSWORD_RESET, OtpChannel.EMAIL);
    return {
      message: 'If an account exists for this email, a reset code will be provided.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('No active password reset request for this email.');
    }
    await this.otpService.verifyOtp(dto.email, OtpPurpose.PASSWORD_RESET, dto.otp);
    await this.usersService.updatePassword(user._id.toString(), dto.newPassword);
    return { message: 'Password reset successfully. You can now log in.' };
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    await this.otpService.verifyOtp(email, OtpPurpose.EMAIL_VERIFICATION, otp);
    await this.usersService.markEmailVerified(user._id.toString());
    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerificationOtp(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.emailVerified) {
      throw new BadRequestException('This email is already verified.');
    }
    const channel = user.verificationChannel ?? OtpChannel.EMAIL;
    if (channel === OtpChannel.SMS && !user.phone) {
      throw new BadRequestException(
        'No phone number on file. Please update your profile to receive codes by SMS.',
      );
    }
    await this.otpService.requestOtp(
      email,
      OtpPurpose.EMAIL_VERIFICATION,
      channel,
      channel === OtpChannel.SMS ? user.phone : undefined,
    );
    return { message: 'A new verification code has been sent.' };
  }
}
