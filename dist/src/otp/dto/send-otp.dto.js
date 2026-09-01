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
exports.SendOtpDto = void 0;
const class_validator_1 = require("class-validator");
const otp_schema_1 = require("../schemas/otp.schema");
class SendOtpDto {
    email;
    purpose;
    channel;
    phone;
}
exports.SendOtpDto = SendOtpDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'A valid email is required' }),
    __metadata("design:type", String)
], SendOtpDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(otp_schema_1.OtpPurpose, { message: 'Invalid purpose' }),
    __metadata("design:type", String)
], SendOtpDto.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(otp_schema_1.OtpChannel, { message: 'Invalid verification channel' }),
    __metadata("design:type", String)
], SendOtpDto.prototype, "channel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{1,14}$/, {
        message: 'Phone must be in international format, e.g. +14155552671',
    }),
    __metadata("design:type", String)
], SendOtpDto.prototype, "phone", void 0);
//# sourceMappingURL=send-otp.dto.js.map