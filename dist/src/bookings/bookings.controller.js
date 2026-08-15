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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const parse_mongo_id_pipe_1 = require("../common/pipes/parse-mongo-id.pipe");
const bookings_service_1 = require("./bookings.service");
const availability_service_1 = require("./availability.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const availability_query_dto_1 = require("./dto/availability-query.dto");
let BookingsController = class BookingsController {
    bookingsService;
    availabilityService;
    constructor(bookingsService, availabilityService) {
        this.bookingsService = bookingsService;
        this.availabilityService = availabilityService;
    }
    getAvailability(query) {
        const serviceIds = query.serviceIds
            ? query.serviceIds
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean)
            : query.serviceId
                ? [query.serviceId]
                : [];
        return this.availabilityService.getAvailableSlots(query.date, serviceIds);
    }
    create(user, dto) {
        return this.bookingsService.create(user.id, dto);
    }
    findAll(user) {
        return this.bookingsService.findAllForCustomer(user.id);
    }
    findOne(user, id) {
        return this.bookingsService.findForCustomer(user.id, id);
    }
    cancel(user, id) {
        return this.bookingsService.cancelForCustomer(user.id, id);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Get)('availability'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [availability_query_dto_1.AvailabilityQueryDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.Post)('bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_booking_dto_1.CreateBookingDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('bookings/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', parse_mongo_id_pipe_1.ParseMongoIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('bookings/:id/cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', parse_mongo_id_pipe_1.ParseMongoIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "cancel", null);
exports.BookingsController = BookingsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService,
        availability_service_1.AvailabilityService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map