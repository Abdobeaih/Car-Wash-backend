
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

const DIAL_CODE_TO_COUNTRY: Record<string, string> = {
  '1': 'US',
  '20': 'EG',
  '44': 'GB',
  '49': 'DE',
  '33': 'FR',
  '34': 'ES',
  '39': 'IT',
  '61': 'AU',
  '81': 'JP',
  '82': 'KR',
  '86': 'CN',
  '91': 'IN',
  '971': 'AE',
  '966': 'SA',
  '965': 'KW',
  '974': 'QA',
  '968': 'OM',
  '973': 'BH',
  '962': 'JO',
  '55': 'BR',
  '52': 'MX',
  '7': 'RU',
  '31': 'NL',
  '32': 'BE',
  '41': 'CH',
  '46': 'SE',
  '47': 'NO',
  '48': 'PL',
  '351': 'PT',
  '30': 'GR',
  '90': 'TR',
};

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
      throw new BadRequestException(
        'An account with this email already exists.',
      );
    }

    if (
      dto.confirmPassword !== undefined &&
      dto.confirmPassword !== dto.password
    ) {
      throw new BadRequestException('Passwords do not match.');
    }

    // Registration verification remains EMAIL only.
    const channel = OtpChannel.EMAIL;

    // Normalize phone before saving it.
    const phone = this.resolvePhone(dto);

    // Resolve ISO country code.
    const countryCode = this.resolveCountryCode(dto);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,

      // IMPORTANT:
      // The phone entered by the frontend is persisted.
      phone,

      countryCode,

      verificationChannel: channel,
      role: UserRole.CUSTOMER,
    });

    try {
      await this.otpService.requestOtp(
        dto.email,
        OtpPurpose.EMAIL_VERIFICATION,
        channel,
      );
    } catch (err) {
      await this.usersService.deleteUser(user._id);
      throw err;
    }

    return {
      user,
      message:
        'Account created. A verification code was sent to your email. Please verify your email to log in.',
    };
  }

  /**
   * Converts the frontend phone + dialCode into one canonical
   * international phone number.
   *
   * Example:
   * dialCode = "+20"
   * phone    = "1012345678"
   *
   * Result:
   * "+201012345678"
   */
  private resolvePhone(dto: RegisterDto): string | undefined {
    if (!dto.phone) {
      return undefined;
    }

    const phone = dto.phone.replace(/[^\d+]/g, '');

    // Already a full international number.
    if (phone.startsWith('+')) {
      return phone;
    }

    // If dialCode exists, combine it with the national number.
    if (dto.dialCode) {
      const dialCode = dto.dialCode.replace(/[^\d]/g, '');
      const nationalNumber = phone.replace(/\D/g, '');

      if (!dialCode || !nationalNumber) {
        return undefined;
      }

      return `+${dialCode}${nationalNumber}`;
    }

    // No dial code, but a numeric phone was provided.
    return `+${phone.replace(/\D/g, '')}`;
  }

  /**
   * Resolves the ISO 2-letter country code.
   */
  private resolveCountryCode(dto: RegisterDto): string | undefined {
    if (dto.countryCode) {
      return dto.countryCode.toUpperCase();
    }

    if (dto.country && /^[A-Za-z]{2}$/.test(dto.country)) {
      return dto.country.toUpperCase();
    }

    if (dto.dialCode) {
      const dialCode = dto.dialCode.replace(/[^\d]/g, '');

      return DIAL_CODE_TO_COUNTRY[dialCode];
    }

    return undefined;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await this.usersService.verifyPassword(
      user,
      dto.password,
    );

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

        // IMPORTANT:
        // Return the phone stored in MongoDB after login.
        phone: user.phone,

        countryCode: user.countryCode,
        role: user.role,
        emailVerified: true,
      },

      token: this.signToken(
        user._id.toString(),
        user.email,
        user.role,
      ),
    };
  }

  signToken(
    id: string,
    email: string,
    role: UserRole,
  ): string {
    return this.jwtService.sign(
      {
        email,
        role,
      },
      {
        subject: id,
      },
    );
  }

  async getCurrentUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const current = await this.usersService.findById(userId);

    if (!current) {
      throw new NotFoundException('User not found.');
    }

    const newEmail = dto.email?.toLowerCase();

    if (newEmail && newEmail !== current.email) {
      const existing = await this.usersService.findByEmail(newEmail);

      if (
        existing &&
        existing._id.toString() !== userId
      ) {
        throw new BadRequestException(
          'An account with this email already exists.',
        );
      }
    }

    const updated = await this.usersService.updateProfile(
      userId,
      {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    );

    if (!updated) {
      throw new NotFoundException('User not found.');
    }

    return updated;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ) {
    const user =
      await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const valid =
      await this.usersService.verifyPassword(
        user,
        dto.currentPassword,
      );

    if (!valid) {
      throw new BadRequestException(
        'Current password is incorrect.',
      );
    }

    await this.usersService.updatePassword(
      userId,
      dto.newPassword,
    );

    return {
      message: 'Password changed successfully',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user =
      await this.usersService.findByEmail(dto.email);

    if (!user) {
      return {
        message:
          'If an account exists for this email, a reset code will be provided.',
      };
    }

    await this.otpService.requestOtp(
      dto.email,
      OtpPurpose.PASSWORD_RESET,
      OtpChannel.EMAIL,
    );

    return {
      message:
        'If an account exists for this email, a reset code will be provided.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user =
      await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new BadRequestException(
        'No active password reset request for this email.',
      );
    }

    await this.otpService.verifyOtp(
      dto.email,
      OtpPurpose.PASSWORD_RESET,
      dto.otp,
    );

    await this.usersService.updatePassword(
      user._id.toString(),
      dto.newPassword,
    );

    return {
      message:
        'Password reset successfully. You can now log in.',
    };
  }

  async verifyEmail(
    email: string,
    otp: string,
  ) {
    const user =
      await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    await this.otpService.verifyOtp(
      email,
      OtpPurpose.EMAIL_VERIFICATION,
      otp,
    );

    await this.usersService.markEmailVerified(
      user._id.toString(),
    );

    return {
      message:
        'Email verified successfully. You can now log in.',
    };
  }

  async resendVerificationOtp(email: string) {
    const user =
      await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    if (user.emailVerified) {
      throw new BadRequestException(
        'This email is already verified.',
      );
    }

    await this.otpService.requestOtp(
      email,
      OtpPurpose.EMAIL_VERIFICATION,
      OtpChannel.EMAIL,
    );
    return {
      message:
        'A new verification code has been sent to your email.',
    };
  }
}

