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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const booking_schema_1 = require("../bookings/schemas/booking.schema");
const service_schema_1 = require("../services/schemas/service.schema");
const addon_schema_1 = require("../addons/schemas/addon.schema");
const notifications_service_1 = require("../notifications/notifications.service");
const roles_1 = require("../common/constants/roles");
const slugify_1 = require("../common/utils/slugify");
let AdminService = AdminService_1 = class AdminService {
    userModel;
    bookingModel;
    serviceModel;
    addOnModel;
    notificationsService;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(userModel, bookingModel, serviceModel, addOnModel, notificationsService) {
        this.userModel = userModel;
        this.bookingModel = bookingModel;
        this.serviceModel = serviceModel;
        this.addOnModel = addOnModel;
        this.notificationsService = notificationsService;
    }
    async getDashboard() {
        const [totalBookings, pending, confirmed, completed, customers, revenueAgg] = await Promise.all([
            this.bookingModel.countDocuments(),
            this.bookingModel.countDocuments({ status: booking_schema_1.BookingStatus.PENDING }),
            this.bookingModel.countDocuments({ status: booking_schema_1.BookingStatus.CONFIRMED }),
            this.bookingModel.countDocuments({ status: booking_schema_1.BookingStatus.COMPLETED }),
            this.userModel.countDocuments({ role: roles_1.UserRole.CUSTOMER }),
            this.bookingModel.aggregate([
                { $match: { status: { $nin: [booking_schema_1.BookingStatus.CANCELLED] } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
        ]);
        return {
            totalBookings,
            pendingBookings: pending,
            confirmedBookings: confirmed,
            completedBookings: completed,
            customers,
            revenue: revenueAgg.length > 0 ? revenueAgg[0].total : 0,
        };
    }
    async getCalendar(start, end) {
        const query = {
            status: { $nin: [booking_schema_1.BookingStatus.CANCELLED] },
        };
        if (start || end) {
            const dateQuery = {};
            if (start)
                dateQuery.$gte = start;
            if (end)
                dateQuery.$lte = end;
            query.date = dateQuery;
        }
        return this.bookingModel
            .find(query)
            .sort({ date: 1, startTime: 1 })
            .populate('serviceId vehicleId customerId')
            .exec();
    }
    async getServices() {
        return this.serviceModel.find().sort({ createdAt: -1 }).exec();
    }
    async createService(dto) {
        const slug = dto.slug ?? (0, slugify_1.slugify)(dto.name);
        const created = new this.serviceModel({ ...dto, slug });
        return created.save();
    }
    async updateService(id, dto) {
        const existing = await this.serviceModel.findById(id).exec();
        if (!existing) {
            throw new common_1.NotFoundException('Service not found.');
        }
        const patch = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
        Object.assign(existing, patch);
        return existing.save();
    }
    async deleteService(id) {
        await this.serviceModel.findByIdAndDelete(id).exec();
    }
    async getAddOns() {
        return this.addOnModel.find().sort({ createdAt: -1 }).exec();
    }
    async createAddOn(dto) {
        const created = new this.addOnModel(dto);
        return created.save();
    }
    async updateAddOn(id, dto) {
        const existing = await this.addOnModel.findById(id).exec();
        if (!existing) {
            throw new common_1.NotFoundException('Add-on not found.');
        }
        const patch = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
        Object.assign(existing, patch);
        return existing.save();
    }
    async deleteAddOn(id) {
        await this.addOnModel.findByIdAndDelete(id).exec();
    }
    async getBookings(status, search) {
        const query = {};
        if (status)
            query.status = status;
        let ids = [];
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            const users = await this.userModel
                .find({ $or: [{ name: regex }, { email: regex }] }, { _id: 1 })
                .exec();
            ids = users.map((u) => u._id);
            if (ids.length > 0)
                query.customerId = { $in: ids };
            else
                query._id = { $in: [] };
        }
        return this.bookingModel
            .find(query)
            .sort({ createdAt: -1 })
            .populate('customerId vehicleId serviceId addOnIds services.serviceId services.addOnIds')
            .exec();
    }
    async getBooking(id) {
        const booking = await this.bookingModel
            .findById(id)
            .populate('customerId vehicleId serviceId addOnIds services.serviceId services.addOnIds')
            .exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found.');
        }
        return booking;
    }
    async updateBookingStatus(id, dto) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found.');
        }
        const previousStatus = booking.status;
        booking.status = dto.status;
        const saved = await booking.save();
        const populated = await this.bookingModel.populate(saved, [
            { path: 'customerId' },
            { path: 'vehicleId' },
            { path: 'serviceId' },
            { path: 'addOnIds' },
        ]);
        if (previousStatus !== dto.status) {
            try {
                await this.notificationsService.createBookingStatusNotification(booking.customerId, populated, dto.status);
            }
            catch (err) {
                this.logger.warn('Failed to create booking status notification', err);
            }
        }
        return populated;
    }
    async getCustomers(search) {
        const query = { role: roles_1.UserRole.CUSTOMER };
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = { $regex: escaped, $options: 'i' };
            query.$or = [{ name: regex }, { email: regex }];
        }
        const customers = await this.userModel.find(query).sort({ createdAt: -1 }).lean().exec();
        return Promise.all(customers.map(async (c) => {
            const bookingCount = await this.bookingModel.countDocuments({
                customerId: c._id.toString(),
            });
            return {
                _id: c._id.toString(),
                name: c.name,
                email: c.email,
                role: c.role,
                bookingCount,
                createdAt: c.createdAt,
            };
        }));
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(booking_schema_1.Booking.name)),
    __param(2, (0, mongoose_1.InjectModel)(service_schema_1.CarService.name)),
    __param(3, (0, mongoose_1.InjectModel)(addon_schema_1.AddOn.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        notifications_service_1.NotificationsService])
], AdminService);
//# sourceMappingURL=admin.service.js.map