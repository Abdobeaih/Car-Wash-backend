import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { BookingStatus } from '../../bookings/schemas/booking.schema';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  BOOKING_STATUS = 'BOOKING_STATUS',
  CONTACT_MESSAGE = 'CONTACT_MESSAGE',
}

@Schema({ _id: false })
export class NotificationData {
  @Prop({ type: SchemaTypes.ObjectId })
  bookingId?: string;

  @Prop({ type: String })
  status?: BookingStatus;

  @Prop({ type: String })
  date?: string;

  @Prop({ type: String })
  startTime?: string;

  @Prop({ type: String })
  endTime?: string;

  @Prop({ type: String })
  serviceName?: string;

  @Prop({ type: String })
  vehicleName?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  contactId?: string;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: Number })
  total?: number;
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User', index: true })
  recipientId: string;

  @Prop({ required: true, enum: NotificationType, type: String })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ required: true, type: NotificationData })
  data: NotificationData;

  @Prop({ required: true, default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
