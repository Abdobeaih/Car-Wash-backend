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
exports.CreateBookingDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const is_valid_date_string_validator_1 = require("../validators/is-valid-date-string.validator");
const is_valid_time_string_validator_1 = require("../validators/is-valid-time-string.validator");
class LocationDto {
    country;
    city;
    address;
    latitude;
    longitude;
    notes;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Country is required' }),
    __metadata("design:type", String)
], LocationDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'City is required' }),
    __metadata("design:type", String)
], LocationDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5, { message: 'Address is required' }),
    __metadata("design:type", String)
], LocationDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LocationDto.prototype, "latitude", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], LocationDto.prototype, "longitude", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], LocationDto.prototype, "notes", void 0);
class ServiceSelectionDto {
    serviceId;
    addOnIds;
}
__decorate([
    (0, class_validator_1.IsMongoId)({ message: 'A valid service is required' }),
    __metadata("design:type", String)
], ServiceSelectionDto.prototype, "serviceId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)({ message: 'Add-ons must be unique' }),
    (0, class_validator_1.IsMongoId)({ each: true, message: 'Invalid add-on id' }),
    __metadata("design:type", Array)
], ServiceSelectionDto.prototype, "addOnIds", void 0);
class CreateBookingDto {
    vehicleId;
    services;
    date;
    startTime;
    location;
}
exports.CreateBookingDto = CreateBookingDto;
__decorate([
    (0, class_validator_1.IsMongoId)({ message: 'A valid vehicle is required' }),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "vehicleId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ServiceSelectionDto),
    __metadata("design:type", Array)
], CreateBookingDto.prototype, "services", void 0);
__decorate([
    (0, is_valid_date_string_validator_1.IsValidDateString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "date", void 0);
__decorate([
    (0, is_valid_time_string_validator_1.IsValidTimeString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsNotEmptyObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LocationDto),
    __metadata("design:type", LocationDto)
], CreateBookingDto.prototype, "location", void 0);
//# sourceMappingURL=create-booking.dto.js.map