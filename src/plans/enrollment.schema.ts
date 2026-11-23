import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, HydratedDocument } from 'mongoose';
export type EnrollmentDocument = HydratedDocument<Enrollment>;
@Schema({ timestamps: true, autoCreate: false, autoIndex: false })
export class Enrollment {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User', index: true })
  customerId: string;
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Vehicle' }) vehicleId: string;
  @Prop({ required: true }) planCode: string;
  @Prop({ required: true }) termsVersion: string;
  @Prop({ type: SchemaTypes.Mixed, required: true }) terms: Record<string, unknown>;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) nameAr: string;
  @Prop({ required: true, min: 0 }) price: number;
  @Prop({ required: true, default: 'EGP', enum: ['EGP'] }) currency: string;
  @Prop({ required: true }) startsAt: Date;
  @Prop({ required: true }) endsAt: Date;
  @Prop({ type: SchemaTypes.Mixed, required: true }) remaining: Record<string, number>;
  @Prop({ type: SchemaTypes.Mixed, required: true }) serviceIds: Record<string, string>;
  @Prop({ required: true, enum: ['ACTIVE', 'CANCEL_AT_END'], default: 'ACTIVE' }) status: string;
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User' }) activatedBy: string;
  @Prop({ maxlength: 200 }) paymentReference?: string;
  @Prop({ required: true }) activationKey: string;
  @Prop({ default: 'PENDING', enum: ['PENDING', 'SENT'] }) expiryReminder: string;
}
export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
EnrollmentSchema.index({ activationKey: 1 }, { unique: true });
