import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserRole } from '../common/constants/roles';
import { BookingStatus } from '../bookings/schemas/booking.schema';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

interface BookingLike {
  _id?: string | Types.ObjectId;
  customerId: string | Types.ObjectId | { _id?: string; name?: string };
  serviceId: string | { name?: string };
  vehicleId: string | { brand?: string; model?: string };
  date: string;
  startTime: string;
  endTime: string;
  total: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    recipientId: string,
    input: {
      type: NotificationType;
      title: string;
      message: string;
      data: Record<string, unknown>;
    },
  ): Promise<NotificationDocument> {
    const created = new this.notificationModel({
      recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
      read: false,
    });
    return created.save();
  }

  async createBookingStatusNotification(
    recipientId: string,
    booking: BookingLike,
    status: BookingStatus,
  ): Promise<NotificationDocument> {
    const serviceName = this.serviceName(booking.serviceId);
    const vehicleName = this.vehicleName(booking.vehicleId);
    const { title, message } = this.buildStatusCopy(serviceName, vehicleName, booking, status);

    return this.create(recipientId, {
      type: NotificationType.BOOKING_STATUS,
      title,
      message,
      data: {
        bookingId: this.idOf(booking),
        status,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        serviceName,
        vehicleName,
        total: booking.total,
      },
    });
  }

  async notifyAdminsOfCancellation(booking: BookingLike): Promise<void> {
    const admins = await this.adminIds();
    if (admins.length === 0) return;
    const customerName = await this.customerName(booking.customerId);
    const serviceName = this.serviceName(booking.serviceId);
    const vehicleName = this.vehicleName(booking.vehicleId);

    const { title, message } = this.buildStatusCopy(
      serviceName,
      vehicleName,
      booking,
      BookingStatus.CANCELLED,
      { actor: customerName },
    );

    await this.notifyAdmins(admins, {
      type: NotificationType.BOOKING_STATUS,
      title,
      message,
      data: {
        bookingId: this.idOf(booking),
        status: BookingStatus.CANCELLED,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        serviceName,
        vehicleName,
        total: booking.total,
      },
    });
  }

  async notifyAdminsOfNewBooking(booking: BookingLike): Promise<void> {
    const admins = await this.adminIds();
    if (admins.length === 0) return;
    const customerName = await this.customerName(booking.customerId);
    const serviceName = this.serviceName(booking.serviceId);
    const vehicleName = this.vehicleName(booking.vehicleId);
    const when = `${booking.date} at ${booking.startTime}`;

    await this.notifyAdmins(admins, {
      type: NotificationType.BOOKING_STATUS,
      title: 'New booking request',
      message: `${customerName} requested a ${serviceName} for ${vehicleName} on ${when}. Total: $${booking.total}.`,
      data: {
        bookingId: this.idOf(booking),
        status: BookingStatus.PENDING,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        serviceName,
        vehicleName,
        total: booking.total,
      },
    });
  }

  async notifyAdminsOfContactMessage(input: {
    name: string;
    email: string;
    message: string;
    contactId: string;
  }): Promise<void> {
    const admins = await this.adminIds();
    if (admins.length === 0) return;

    await this.notifyAdmins(admins, {
      type: NotificationType.CONTACT_MESSAGE,
      title: 'New contact message',
      message: `${input.name} (${input.email}) submitted a message: ${input.message}`,
      data: {
        contactId: input.contactId,
        name: input.name,
        email: input.email,
      },
    });
  }

  async findAllForUser(recipientId: string): Promise<NotificationDocument[]> {
    return this.notificationModel.find({ recipientId }).sort({ createdAt: -1 }).limit(100).exec();
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationModel.countDocuments({ recipientId, read: false });
  }

  async markAsRead(recipientId: string, id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findOneAndUpdate({ _id: id, recipientId }, { read: true }, { new: true })
      .exec();
    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }
    return notification;
  }

  async markAllAsRead(recipientId: string): Promise<{ modified: number }> {
    const result = await this.notificationModel
      .updateMany({ recipientId, read: false }, { read: true })
      .exec();
    return { modified: result.modifiedCount };
  }

  private buildStatusCopy(
    serviceName: string,
    vehicleName: string,
    booking: BookingLike,
    status: BookingStatus,
    extras: { actor?: string } = {},
  ): { title: string; message: string } {
    const when = `${booking.date} at ${booking.startTime}`;
    switch (status) {
      case BookingStatus.CONFIRMED:
        return {
          title: 'Booking confirmed',
          message: `Your ${serviceName} appointment for ${vehicleName} on ${when} has been confirmed.`,
        };
      case BookingStatus.COMPLETED:
        return {
          title: 'Appointment completed',
          message: `Your ${serviceName} appointment for ${vehicleName} on ${when} has been completed. Total: $${booking.total}.`,
        };
      case BookingStatus.CANCELLED:
        return extras.actor
          ? {
              title: 'Booking cancelled by customer',
              message: `${extras.actor} cancelled their ${serviceName} appointment for ${vehicleName} on ${when}.`,
            }
          : {
              title: 'Booking cancelled',
              message: `Your ${serviceName} appointment for ${vehicleName} on ${when} has been cancelled.`,
            };
      default:
        return {
          title: 'Booking updated',
          message: `Your ${serviceName} appointment on ${when} has been updated to ${status}.`,
        };
    }
  }

  private idOf(booking: BookingLike): string {
    return booking._id ? booking._id.toString() : '';
  }

  private serviceName(service: BookingLike['serviceId']): string {
    return typeof service === 'object' && service?.name ? service.name : 'Service';
  }

  private vehicleName(vehicle: BookingLike['vehicleId']): string {
    return typeof vehicle === 'object' && vehicle?.brand
      ? `${vehicle.brand} ${vehicle.model ?? ''}`.trim()
      : 'your vehicle';
  }

  private async customerName(customer: BookingLike['customerId']): Promise<string> {
    if (typeof customer === 'object' && customer !== null && 'name' in customer && customer.name) {
      return customer.name;
    }
    const id = typeof customer === 'string' ? customer : String(customer);
    const user = await this.userModel.findById(id, { name: 1 }).lean().exec();
    return user?.name ?? 'A customer';
  }

  private async adminIds(): Promise<Types.ObjectId[]> {
    const admins = await this.userModel.find({ role: UserRole.ADMIN }, { _id: 1 }).lean().exec();
    return admins.map((admin) => admin._id as Types.ObjectId);
  }

  private async notifyAdmins(
    adminIds: Types.ObjectId[],
    input: {
      type: NotificationType;
      title: string;
      message: string;
      data: Record<string, unknown>;
    },
  ): Promise<void> {
    await Promise.all(adminIds.map((id) => this.create(id.toString(), input)));
  }
}
