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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingSchema = exports.Booking = exports.BookingServiceItem = exports.BookingLocation = exports.PaymentStatus = exports.BookingStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "PENDING";
    BookingStatus["CONFIRMED"] = "CONFIRMED";
    BookingStatus["COMPLETED"] = "COMPLETED";
    BookingStatus["CANCELLED"] = "CANCELLED";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
let BookingLocation = class BookingLocation {
    country;
    city;
    address;
    latitude;
    longitude;
    notes;
};
exports.BookingLocation = BookingLocation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], BookingLocation.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], BookingLocation.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], BookingLocation.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], BookingLocation.prototype, "latitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], BookingLocation.prototype, "longitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], BookingLocation.prototype, "notes", void 0);
exports.BookingLocation = BookingLocation = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], BookingLocation);
let BookingServiceItem = class BookingServiceItem {
    serviceId;
    addOnIds;
    duration;
    subtotal;
};
exports.BookingServiceItem = BookingServiceItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.SchemaTypes.ObjectId, ref: 'CarService' }),
    __metadata("design:type", String)
], BookingServiceItem.prototype, "serviceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: [mongoose_2.SchemaTypes.ObjectId], ref: 'AddOn' }),
    __metadata("design:type", Array)
], BookingServiceItem.prototype, "addOnIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], BookingServiceItem.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], BookingServiceItem.prototype, "subtotal", void 0);
exports.BookingServiceItem = BookingServiceItem = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], BookingServiceItem);
let Booking = class Booking {
    customerId;
    vehicleId;
    serviceId;
    addOnIds;
    services;
    date;
    startTime;
    endTime;
    duration;
    subtotal;
    total;
    status;
    paymentStatus;
    location;
};
exports.Booking = Booking;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.SchemaTypes.ObjectId, ref: 'User', index: true }),
    __metadata("design:type", String)
], Booking.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.SchemaTypes.ObjectId, ref: 'Vehicle', index: true }),
    __metadata("design:type", String)
], Booking.prototype, "vehicleId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.SchemaTypes.ObjectId, ref: 'CarService', index: true }),
    __metadata("design:type", String)
], Booking.prototype, "serviceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: [mongoose_2.SchemaTypes.ObjectId], ref: 'AddOn' }),
    __metadata("design:type", Array)
], Booking.prototype, "addOnIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: [BookingServiceItem] }),
    __metadata("design:type", Array)
], Booking.prototype, "services", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Booking.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Booking.prototype, "startTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Booking.prototype, "endTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Booking.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Booking.prototype, "subtotal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Booking.prototype, "total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: BookingStatus, default: BookingStatus.PENDING, type: String }),
    __metadata("design:type", String)
], Booking.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING, type: String }),
    __metadata("design:type", String)
], Booking.prototype, "paymentStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: BookingLocation }),
    __metadata("design:type", BookingLocation)
], Booking.prototype, "location", void 0);
exports.Booking = Booking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Booking);
exports.BookingSchema = mongoose_1.SchemaFactory.createForClass(Booking);
exports.BookingSchema.index({ date: 1, startTime: 1, endTime: 1 });
exports.BookingSchema.index({ customerId: 1, createdAt: -1 });
//# sourceMappingURL=booking.schema.js.map