import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum OtpPurpose {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export type OtpDocument = HydratedDocument<Otp>;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, enum: OtpPurpose, type: String, index: true })
  purpose: OtpPurpose;

  @Prop({ required: true })
  otpHash: string;

  @Prop({ required: true, type: Date })
  expiresAt: Date;

  @Prop({ required: true, default: 0 })
  attempts: number;

  @Prop({ required: true, default: false })
  used: boolean;

  @Prop({ required: true, default: 1 })
  requestCount: number;

  @Prop({ required: true, type: Date })
  rateWindowStart: Date;

  @Prop({ required: true, type: Date })
  lastRequestAt: Date;

  @Prop({ type: Date })
  usedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
OtpSchema.index({ email: 1, purpose: 1, createdAt: -1 });
