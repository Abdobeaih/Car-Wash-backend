"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const roles_1 = require("../common/constants/roles");
const booking_schema_1 = require("../bookings/schemas/booking.schema");
const notification_schema_1 = require("./schemas/notification.schema");
let NotificationsService = class NotificationsService {
    notificationModel;
    userModel;
    constructor(notificationModel, userModel) {
        this.notificationModel = notificationModel;
        this.userModel = userModel;
    }
    async create(recipientId, input) {
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
    async createBookingStatusNotification(recipientId, booking, status) {
        const serviceName = this.serviceName(booking.serviceId);
        const vehicleName = this.vehicleName(booking.vehicleId);
        const { title, message } = this.buildStatusCopy(serviceName, vehicleName, booking, status);
        return this.create(recipientId, {
            type: notification_schema_1.NotificationType.BOOKING_STATUS,
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
    async notifyAdminsOfCancellation(booking) {
        const admins = await this.adminIds();
        if (admins.length === 0)
            return;
        const customerName = await this.customerName(booking.customerId);
        const serviceName = this.serviceName(booking.serviceId);
        const vehicleName = this.vehicleName(booking.vehicleId);
        const { title, message } = this.buildStatusCopy(serviceName, vehicleName, booking, booking_schema_1.BookingStatus.CANCELLED, { actor: customerName });
        await this.notifyAdmins(admins, {
            type: notification_schema_1.NotificationType.BOOKING_STATUS,
            title,
            message,
            data: {
                bookingId: this.idOf(booking),
                status: booking_schema_1.BookingStatus.CANCELLED,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
                serviceName,
                vehicleName,
                total: booking.total,
            },
        });
    }
    async notifyAdminsOfNewBooking(booking) {
        const admins = await this.adminIds();
        if (admins.length === 0)
            return;
        const customerName = await this.customerName(booking.customerId);
        const serviceName = this.serviceName(booking.serviceId);
        const vehicleName = this.vehicleName(booking.vehicleId);
        const when = `${booking.date} at ${booking.startTime}`;
        await this.notifyAdmins(admins, {
            type: notification_schema_1.NotificationType.BOOKING_STATUS,
            title: 'New booking request',
            message: `${customerName} requested a ${serviceName} for ${vehicleName} on ${when}. Total: $${booking.total}.`,
            data: {
                bookingId: this.idOf(booking),
                status: booking_schema_1.BookingStatus.PENDING,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
                serviceName,
                vehicleName,
                total: booking.total,
            },
        });
    }
    async notifyAdminsOfContactMessage(input) {
        const admins = await this.adminIds();
        if (admins.length === 0)
            return;
        await this.notifyAdmins(admins, {
            type: notification_schema_1.NotificationType.CONTACT_MESSAGE,
            title: 'New contact message',
            message: `${input.name} (${input.email}) submitted a message: ${input.message}`,
            data: {
                contactId: input.contactId,
                name: input.name,
                email: input.email,
            },
        });
    }
    async findAllForUser(recipientId) {
        return this.notificationModel.find({ recipientId }).sort({ createdAt: -1 }).limit(100).exec();
    }
    async getUnreadCount(recipientId) {
        return this.notificationModel.countDocuments({ recipientId, read: false });
    }
    async markAsRead(recipientId, id) {
        const notification = await this.notificationModel
            .findOneAndUpdate({ _id: id, recipientId }, { read: true }, { new: true })
            .exec();
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found.');
        }
        return notification;
    }
    async markAllAsRead(recipientId) {
        const result = await this.notificationModel
            .updateMany({ recipientId, read: false }, { read: true })
            .exec();
        return { modified: result.modifiedCount };
    }
    buildStatusCopy(serviceName, vehicleName, booking, status, extras = {}) {
        const when = `${booking.date} at ${booking.startTime}`;
        switch (status) {
            case booking_schema_1.BookingStatus.CONFIRMED:
                return {
                    title: 'Booking confirmed',
                    message: `Your ${serviceName} appointment for ${vehicleName} on ${when} has been confirmed.`,
                };
            case booking_schema_1.BookingStatus.COMPLETED:
                return {
                    title: 'Appointment completed',
                    message: `Your ${serviceName} appointment for ${vehicleName} on ${when} has been completed. Total: $${booking.total}.`,
                };
            case booking_schema_1.BookingStatus.CANCELLED:
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
    idOf(booking) {
        return booking._id ? booking._id.toString() : '';
    }
    serviceName(service) {
        return typeof service === 'object' && service?.name ? service.name : 'Service';
    }
    vehicleName(vehicle) {
        return typeof vehicle === 'object' && vehicle?.brand
            ? `${vehicle.brand} ${vehicle.model ?? ''}`.trim()
            : 'your vehicle';
    }
    async customerName(customer) {
        if (typeof customer === 'object' && customer !== null && 'name' in customer && customer.name) {
            return customer.name;
        }
        const id = typeof customer === 'string' ? customer : String(customer);
        const user = await this.userModel.findById(id, { name: 1 }).lean().exec();
        return user?.name ?? 'A customer';
    }
    async adminIds() {
        const admins = await this.userModel.find({ role: roles_1.UserRole.ADMIN }, { _id: 1 }).lean().exec();
        return admins.map((admin) => admin._id);
    }
    async notifyAdmins(adminIds, input) {
        await Promise.all(adminIds.map((id) => this.create(id.toString(), input)));
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map