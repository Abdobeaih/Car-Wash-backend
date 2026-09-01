"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcryptjs"));
const otp_schema_1 = require("./schemas/otp.schema");
const mail_service_1 = require("./mail.service");
const otp_errors_1 = require("./otp-errors");
const otp_config_1 = require("./otp-config");
let OtpService = class OtpService {
    otpModel;
    mailService;
    constructor(otpModel, mailService) {
        this.otpModel = otpModel;
        this.mailService = mailService;
    }
    async requestOtp(email, purpose) {
        const normalized = email.toLowerCase();
        const now = Date.now();
        const latest = await this.findLatest(normalized, purpose);
        if (latest && now - latest.lastRequestAt.getTime() < otp_config_1.OTP_RESEND_COOLDOWN_MS) {
            const remaining = Math.ceil((otp_config_1.OTP_RESEND_COOLDOWN_MS - (now - latest.lastRequestAt.getTime())) / 1000);
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.RESEND_TOO_SOON, `Please wait ${remaining}s before requesting another code.`);
        }
        const rateLatest = await this.findLatestGlobal(normalized);
        const withinRateWindow = rateLatest && now - rateLatest.rateWindowStart.getTime() < otp_config_1.OTP_RATE_WINDOW_MS;
        if (withinRateWindow && rateLatest.requestCount >= otp_config_1.OTP_MAX_REQUESTS) {
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.RATE_LIMITED, 'Too many code requests. Please try again in 10 minutes.');
        }
        const otp = (0, crypto_1.randomInt)(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(now + otp_config_1.OTP_EXPIRY_MS);
        if (latest) {
            latest.used = true;
            await latest.save();
        }
        await this.otpModel
            .updateMany({
            email: normalized,
            purpose: { $ne: purpose },
            used: false,
            expiresAt: { $gt: new Date(now) },
        }, { $set: { used: true, usedAt: new Date(now) } })
            .exec();
        await this.otpModel.create({
            email: normalized,
            purpose,
            otpHash,
            expiresAt,
            attempts: 0,
            used: false,
            requestCount: withinRateWindow ? rateLatest.requestCount + 1 : 1,
            rateWindowStart: withinRateWindow ? rateLatest.rateWindowStart : new Date(now),
            lastRequestAt: new Date(now),
        });
        await this.mailService.sendOtpEmail({
            to: normalized,
            purpose: purpose === otp_schema_1.OtpPurpose.PASSWORD_RESET ? 'reset' : 'verify',
            otp,
            expiresInMinutes: otp_config_1.OTP_EXPIRY_MS / 60000,
        });
    }
    async verifyOtp(email, purpose, otp) {
        const normalized = email.toLowerCase();
        const record = await this.findLatest(normalized, purpose);
        if (!record) {
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.NOT_FOUND, 'No verification code found for this email.');
        }
        if (record.used) {
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.ALREADY_USED, 'This code has already been used. Request a new one.');
        }
        if (record.expiresAt.getTime() < Date.now()) {
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.EXPIRED, 'This code has expired. Request a new one.');
        }
        if (record.attempts >= otp_config_1.OTP_MAX_ATTEMPTS) {
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.MAX_ATTEMPTS, 'Too many incorrect attempts. Request a new code.');
        }
        const valid = await bcrypt.compare(otp, record.otpHash);
        if (!valid) {
            record.attempts += 1;
            if (record.attempts >= otp_config_1.OTP_MAX_ATTEMPTS) {
                record.used = true;
                record.usedAt = new Date();
                await record.save();
                throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.MAX_ATTEMPTS, 'Too many incorrect attempts. Request a new code.');
            }
            await record.save();
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.INVALID, 'The code you entered is incorrect.');
        }
        record.used = true;
        record.usedAt = new Date();
        await record.save();
    }
    findLatest(email, purpose) {
        return this.otpModel.findOne({ email, purpose }).sort({ createdAt: -1 }).exec();
    }
    findLatestGlobal(email) {
        return this.otpModel.findOne({ email }).sort({ createdAt: -1 }).exec();
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(otp_schema_1.Otp.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mail_service_1.MailService])
], OtpService);
//# sourceMappingURL=otp.service.js.map