"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const booking_schema_1 = require("./schemas/booking.schema");
const vehicle_schema_1 = require("../vehicles/schemas/vehicle.schema");
const service_schema_1 = require("../services/schemas/service.schema");
const addon_schema_1 = require("../addons/schemas/addon.schema");
const notifications_module_1 = require("../notifications/notifications.module");
const bookings_service_1 = require("./bookings.service");
const availability_service_1 = require("./availability.service");
const bookings_controller_1 = require("./bookings.controller");
let BookingsModule = class BookingsModule {
};
exports.BookingsModule = BookingsModule;
exports.BookingsModule = BookingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            notifications_module_1.NotificationsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: booking_schema_1.Booking.name, schema: booking_schema_1.BookingSchema },
                { name: vehicle_schema_1.Vehicle.name, schema: vehicle_schema_1.VehicleSchema },
                { name: service_schema_1.CarService.name, schema: service_schema_1.ServiceSchema },
                { name: addon_schema_1.AddOn.name, schema: addon_schema_1.AddOnSchema },
            ]),
        ],
        controllers: [bookings_controller_1.BookingsController],
        providers: [bookings_service_1.BookingsService, availability_service_1.AvailabilityService],
        exports: [bookings_service_1.BookingsService, availability_service_1.AvailabilityService],
    })
], BookingsModule);
//# sourceMappingURL=bookings.module.js.map