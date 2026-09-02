import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../common/constants/roles';
import { OtpChannel } from '../otp/schemas/otp.schema';

export interface SafeUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    countryCode?: string;
    verificationChannel?: OtpChannel;
    role?: UserRole;
  }): Promise<SafeUser> {
    const hashed = await bcrypt.hash(data.password, 12);
    const created = new this.userModel({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashed,
      phone: data.phone,
      countryCode: data.countryCode,
      verificationChannel: data.verificationChannel ?? OtpChannel.EMAIL,
      role: data.role ?? UserRole.CUSTOMER,
    });
    const saved = await created.save();
    return this.toSafeUser(saved);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password +passwordResetToken +passwordResetExpires')
      .exec();
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? this.toSafeUser(user) : null;
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+password').exec();
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string; phone?: string },
  ): Promise<SafeUser | null> {
    const user = await this.userModel.findById(id).exec();
    if (!user) return null;
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email.toLowerCase();
    if (data.phone !== undefined) user.phone = data.phone;
    const saved = await user.save();
    return this.toSafeUser(saved);
  }

  async updatePassword(id: string, password: string): Promise<void> {
    const hashed = await bcrypt.hash(password, 12);
    await this.userModel.updateOne({ _id: id }, { $set: { password: hashed } }).exec();
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: id }, { $set: { emailVerified: true, emailVerifiedAt: new Date() } })
      .exec();
  }

  async deleteUser(id: string): Promise<void> {
    await this.userModel.deleteOne({ _id: id }).exec();
  }

  async verifyPassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  private toSafeUser(user: UserDocument): SafeUser {
    return {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
