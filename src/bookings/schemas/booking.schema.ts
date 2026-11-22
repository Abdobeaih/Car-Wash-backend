import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Model } from 'mongoose';
import { ConflictException } from '@nestjs/common';
import { toMinutes } from '../working-hours.util';

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

  // Server-derived minute keys. Never accepted from a client or backfilled over old data.
  @Prop({ type: [String], select: false, default: undefined })
  occupiedMinutes?: string[];

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

// One service team, as enforced by the existing global overlap policy. A unique
// multikey index reserves every occupied minute atomically, across API instances.
// Empty/cancelled and legacy documents are excluded without rewriting old data.
BookingSchema.index(
  { occupiedMinutes: 1 },
  {
    unique: true,
    name: 'booking_occupied_minutes_unique',
    partialFilterExpression: { 'occupiedMinutes.0': { $exists: true } },
  },
);
BookingSchema.post('init', function (document) {
  document.$locals.originalStatus = document.status;
});
BookingSchema.post('save', function (document) {
  document.$locals.originalStatus = document.status;
});
BookingSchema.set('toJSON', {
  transform: (_document, result) => {
    delete result.occupiedMinutes;
    return result;
  },
});
BookingSchema.pre('save', async function () {
  const model = this.constructor as Model<Booking>;
  // Do not accept a booking before MongoDB has confirmed its enforcing index.
  await model.init();
  if (this.status === BookingStatus.CANCELLED) {
    this.occupiedMinutes = [];
    return;
  }
  const needsReservation =
    this.isNew ||
    this.isModified('date') ||
    this.isModified('startTime') ||
    this.isModified('endTime') ||
    (this.isModified('status') && this.$locals.originalStatus === BookingStatus.CANCELLED);
  // A status-only update must not rewrite or block an existing legacy booking.
  if (!needsReservation) return;
  const start = Math.floor(toMinutes(this.startTime));
  const end = Math.ceil(toMinutes(this.endTime));
  this.occupiedMinutes = Array.from({ length: end - start }, (_, i) => `${this.date}:${start + i}`);
  // Legacy active bookings have no minute keys. Keep the original overlap check
  // for them, including when an admin restores a cancelled booking.
  const conflict = await model.exists({
    _id: { $ne: this._id },
    date: this.date,
    status: { $ne: BookingStatus.CANCELLED },
    startTime: { $lt: this.endTime },
    endTime: { $gt: this.startTime },
  });
  if (conflict) throw new ConflictException('This time slot is no longer available.');
});
BookingSchema.post(
  'save',
  function (
    error: Error & { code?: number; keyPattern?: { occupiedMinutes?: number } },
    _document: BookingDocument,
    next: (error?: Error) => void,
  ) {
    if (error?.code === 11000 && error?.keyPattern?.occupiedMinutes) {
      return next(new ConflictException('This time slot is no longer available.'));
    }
    next(error);
  },
);
