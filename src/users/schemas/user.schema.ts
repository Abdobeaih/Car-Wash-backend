import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../common/constants/roles';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false, type: Date })
  passwordResetExpires?: Date;

  @Prop({ required: true, default: false })
  emailVerified: boolean;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;

  @Prop({ required: true, enum: UserRole, default: UserRole.CUSTOMER, type: String })
  role: UserRole;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true, uppercase: true })
  countryCode?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
