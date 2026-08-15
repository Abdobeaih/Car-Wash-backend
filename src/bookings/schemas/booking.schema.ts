import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type BookingDocument = HydratedDocument<Booking>;

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

@Schema({ _id: false })
export class BookingLocation {
  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ type: Number })
  latitude?: number;

  @Prop({ type: Number })
  longitude?: number;

  @Prop({ trim: true })
  notes?: string;
}

@Schema({ _id: false })
export class BookingServiceItem {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'CarService' })
  serviceId: string;

  @Prop({ required: true, type: [SchemaTypes.ObjectId], ref: 'AddOn' })
  addOnIds: string[];

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User', index: true })
  customerId: string;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Vehicle', index: true })
  vehicleId: string;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'CarService', index: true })
  serviceId: string;

  @Prop({ required: true, type: [SchemaTypes.ObjectId], ref: 'AddOn' })
  addOnIds: string[];

  @Prop({ required: true, type: [BookingServiceItem] })
  services: BookingServiceItem[];

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ required: true, enum: BookingStatus, default: BookingStatus.PENDING, type: String })
  status: BookingStatus;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING, type: String })
  paymentStatus: PaymentStatus;

  @Prop({ required: true, type: BookingLocation })
  location: BookingLocation;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ date: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ customerId: 1, createdAt: -1 });
