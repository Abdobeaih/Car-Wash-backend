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
exports.OtpController = void 0;
const common_1 = require("@nestjs/common");
const otp_service_1 = require("./otp.service");
const send_otp_dto_1 = require("./dto/send-otp.dto");
const verify_otp_dto_1 = require("./dto/verify-otp.dto");
const otp_schema_1 = require("./schemas/otp.schema");
let OtpController = class OtpController {
    otpService;
    constructor(otpService) {
        this.otpService = otpService;
    }
    async sendOtp(dto) {
        await this.otpService.requestOtp(dto.email, dto.purpose, dto.channel ?? otp_schema_1.OtpChannel.EMAIL, dto.phone);
        return { message: 'Verification code sent.' };
    }
    async verifyOtp(dto) {
        await this.otpService.verifyOtp(dto.email, dto.purpose, dto.otp);
        return { message: 'Verification successful.' };
    }
    async resendOtp(dto) {
        await this.otpService.requestOtp(dto.email, dto.purpose, dto.channel ?? otp_schema_1.OtpChannel.EMAIL, dto.phone);
        return { message: 'A new verification code has been sent.' };
    }
};
exports.OtpController = OtpController;
__decorate([
    (0, common_1.Post)('send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_otp_dto_1.SendOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_otp_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('resend-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_otp_dto_1.SendOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "resendOtp", null);
exports.OtpController = OtpController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [otp_service_1.OtpService])
], OtpController);
//# sourceMappingURL=otp.controller.js.map