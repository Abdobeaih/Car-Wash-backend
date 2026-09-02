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
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const service_schema_1 = require("../services/schemas/service.schema");
const booking_schema_1 = require("./schemas/booking.schema");
const working_hours_util_1 = require("./working-hours.util");
let AvailabilityService = class AvailabilityService {
    serviceModel;
    bookingModel;
    constructor(serviceModel, bookingModel) {
        this.serviceModel = serviceModel;
        this.bookingModel = bookingModel;
    }
    async getAvailableSlots(date, serviceIds) {
        if (serviceIds.length === 0) {
            throw new common_1.NotFoundException('No services provided.');
        }
        const services = await this.serviceModel.find({ _id: { $in: serviceIds } }).exec();
        if (services.length !== serviceIds.length || services.some((s) => !s.isActive)) {
            throw new common_1.NotFoundException('One or more services were not found or are inactive.');
        }
        const start = (0, working_hours_util_1.workingStartMinutes)();
        const end = (0, working_hours_util_1.workingEndMinutes)();
        const step = (0, working_hours_util_1.slotMinutes)();
        const duration = services.reduce((sum, s) => sum + s.duration, 0);
        const slots = [];
        for (let t = start; t + duration <= end; t += step) {
            slots.push({
                start: (0, working_hours_util_1.toHHMM)(t),
                end: (0, working_hours_util_1.toHHMM)(t + duration),
                available: true,
            });
        }
        const existing = await this.bookingModel
            .find({
            date,
            status: { $ne: booking_schema_1.BookingStatus.CANCELLED },
        })
            .exec();
        return slots.map((slot) => {
            const overlaps = existing.some((booking) => timeOverlaps(slot, booking));
            return { ...slot, available: !overlaps };
        });
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(service_schema_1.CarService.name)),
    __param(1, (0, mongoose_1.InjectModel)(booking_schema_1.Booking.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], AvailabilityService);
function timeOverlaps(slot, booking) {
    const s = (0, working_hours_util_1.toMinutes)(slot.start);
    const e = (0, working_hours_util_1.toMinutes)(slot.end);
    const bs = (0, working_hours_util_1.toMinutes)(booking.startTime);
    const be = (0, working_hours_util_1.toMinutes)(booking.endTime);
    return s < be && e > bs;
}
//# sourceMappingURL=availability.service.js.map