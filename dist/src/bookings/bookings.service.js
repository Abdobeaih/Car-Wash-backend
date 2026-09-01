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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const vehicle_schema_1 = require("../vehicles/schemas/vehicle.schema");
const service_schema_1 = require("../services/schemas/service.schema");
const addon_schema_1 = require("../addons/schemas/addon.schema");
const booking_schema_1 = require("./schemas/booking.schema");
const working_hours_util_1 = require("./working-hours.util");
const notifications_service_1 = require("../notifications/notifications.service");
let BookingsService = class BookingsService {
    bookingModel;
    vehicleModel;
    serviceModel;
    addOnModel;
    notificationsService;
    constructor(bookingModel, vehicleModel, serviceModel, addOnModel, notificationsService) {
        this.bookingModel = bookingModel;
        this.vehicleModel = vehicleModel;
        this.serviceModel = serviceModel;
        this.addOnModel = addOnModel;
        this.notificationsService = notificationsService;
    }
    async create(customerId, dto) {
        const vehicle = await this.vehicleModel
            .findOne({ _id: dto.vehicleId, userId: customerId })
            .exec();
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found or does not belong to you.');
        }
        const serviceIds = dto.services.map((s) => s.serviceId);
        const services = await this.serviceModel.find({ _id: { $in: serviceIds } }).exec();
        if (services.length !== serviceIds.length) {
            throw new common_1.BadRequestException('One or more services do not exist.');
        }
        const inactiveService = services.find((s) => !s.isActive);
        if (inactiveService) {
            throw new common_1.BadRequestException(`Service "${inactiveService.name}" is not available.`);
        }
        const serviceById = new Map(services.map((s) => [s._id.toString(), s]));
        const addOnIds = dto.services.flatMap((s) => s.addOnIds);
        const addOns = await this.addOnModel.find({ _id: { $in: addOnIds } }).exec();
        if (addOns.length !== new Set(addOnIds).size) {
            throw new common_1.BadRequestException('One or more add-ons do not exist.');
        }
        const inactiveAddOn = addOns.find((a) => !a.isActive);
        if (inactiveAddOn) {
            throw new common_1.BadRequestException(`Add-on "${inactiveAddOn.name}" is not available.`);
        }
        const addOnById = new Map(addOns.map((a) => [a._id.toString(), a]));
        const items = dto.services.map((selection) => {
            const svc = serviceById.get(selection.serviceId);
            const addOnCost = selection.addOnIds.reduce((sum, id) => sum + (addOnById.get(id)?.price ?? 0), 0);
            return {
                serviceId: selection.serviceId,
                addOnIds: selection.addOnIds,
                duration: svc.duration,
                subtotal: svc.basePrice,
                total: svc.basePrice + addOnCost,
            };
        });
        const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);
        this.validateDate(dto.date);
        this.validateTimeWithinWorkingHours(dto.startTime, totalDuration);
        const endTime = this.computeEndTime(dto.startTime, totalDuration);
        if (this.timeToMinutes(endTime) > (0, working_hours_util_1.workingEndMinutes)()) {
            throw new common_1.BadRequestException('The requested time is outside working hours.');
        }
        const conflicts = await this.bookingModel
            .findOne({
            date: dto.date,
            status: { $ne: booking_schema_1.BookingStatus.CANCELLED },
            $or: [{ startTime: { $lt: endTime }, endTime: { $gt: dto.startTime } }],
        })
            .exec();
        if (conflicts) {
            throw new common_1.ConflictException('This time slot is no longer available.');
        }
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const total = items.reduce((sum, item) => sum + item.total, 0);
        const first = items[0];
        const created = new this.bookingModel({
            customerId,
            vehicleId: dto.vehicleId,
            serviceId: first.serviceId,
            addOnIds: first.addOnIds,
            services: items.map(({ serviceId, addOnIds, duration, subtotal }) => ({
                serviceId,
                addOnIds,
                duration,
                subtotal,
            })),
            date: dto.date,
            startTime: dto.startTime,
            endTime,
            duration: totalDuration,
            subtotal,
            total,
            status: booking_schema_1.BookingStatus.PENDING,
            paymentStatus: 'PENDING',
            location: dto.location,
        });
        const saved = await created.save();
        const populated = await this.populateBooking(saved);
        await this.notificationsService.notifyAdminsOfNewBooking(populated);
        return populated;
    }
    async findAllForCustomer(customerId) {
        return this.bookingModel
            .find({ customerId })
            .sort({ createdAt: -1 })
            .populate('vehicleId serviceId addOnIds services.serviceId services.addOnIds')
            .exec();
    }
    async findForCustomer(customerId, id) {
        const booking = await this.bookingModel
            .findOne({ _id: id, customerId })
            .populate('vehicleId serviceId addOnIds services.serviceId services.addOnIds')
            .exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found.');
        }
        return booking;
    }
    async cancelForCustomer(customerId, id) {
        const booking = await this.bookingModel.findOne({ _id: id, customerId }).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found.');
        }
        if (booking.status === booking_schema_1.BookingStatus.COMPLETED) {
            throw new common_1.ForbiddenException('Completed bookings cannot be cancelled.');
        }
        if (booking.status === booking_schema_1.BookingStatus.CANCELLED) {
            throw new common_1.BadRequestException('This booking is already cancelled.');
        }
        booking.status = booking_schema_1.BookingStatus.CANCELLED;
        const saved = await booking.save();
        const populated = await this.populateBooking(saved);
        await this.notificationsService.notifyAdminsOfCancellation(populated);
        return populated;
    }
    validateDate(date) {
        const parsed = new Date(`${date}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException('Invalid date.');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsed.getTime() < today.getTime()) {
            throw new common_1.BadRequestException('Booking date cannot be in the past.');
        }
    }
    validateTimeWithinWorkingHours(startTime, duration) {
        if (!/^\d{2}:\d{2}$/.test(startTime)) {
            throw new common_1.BadRequestException('Invalid start time.');
        }
        const [h, m] = startTime.split(':').map(Number);
        if (h < 9 || h > 17 || (h === 17 && m > 0)) {
            throw new common_1.BadRequestException('Time must be within working hours (09:00 - 18:00).');
        }
        const start = this.timeToMinutes(startTime);
        if (start < (0, working_hours_util_1.workingStartMinutes)() || start + duration > (0, working_hours_util_1.workingEndMinutes)()) {
            throw new common_1.BadRequestException('Time must be within working hours (09:00 - 18:00).');
        }
    }
    computeEndTime(startTime, duration) {
        const start = this.timeToMinutes(startTime);
        const end = start + duration;
        const h = Math.floor(end / 60);
        const m = end % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    timeToMinutes(time) {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    }
    async populateBooking(booking) {
        return this.bookingModel.populate(booking, [
            { path: 'vehicleId' },
            { path: 'serviceId' },
            { path: 'addOnIds' },
            { path: 'services.serviceId' },
            { path: 'services.addOnIds' },
        ]);
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(booking_schema_1.Booking.name)),
    __param(1, (0, mongoose_1.InjectModel)(vehicle_schema_1.Vehicle.name)),
    __param(2, (0, mongoose_1.InjectModel)(service_schema_1.CarService.name)),
    __param(3, (0, mongoose_1.InjectModel)(addon_schema_1.AddOn.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _c : Object, typeof (_d = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _d : Object, notifications_service_1.NotificationsService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map