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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const resend_1 = require("resend");
const otp_errors_1 = require("./otp-errors");
let MailService = MailService_1 = class MailService {
    configService;
    logger = new common_1.Logger(MailService_1.name);
    resend;
    from;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('RESEND_API_KEY');
        this.from =
            this.configService.get('MAIL_FROM') ?? 'Mobile Car Care <onboarding@resend.dev>';
        this.resend = apiKey ? new resend_1.Resend(apiKey) : null;
    }
    async sendOtpEmail({ to, purpose, otp, expiresInMinutes }) {
        const subject = purpose === 'reset' ? 'Reset your password' : 'Verify your email';
        const text = this.buildText(purpose, otp, expiresInMinutes);
        if (!this.resend) {
            this.logger.warn('RESEND_API_KEY is not configured. Email for ' + to + ' was not sent.');
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.EMAIL_SEND_FAILED, 'Unable to send the verification email. Please try again later.');
        }
        try {
            await this.resend.emails.send({
                from: this.from,
                to,
                subject,
                text,
            });
        }
        catch (err) {
            this.logger.error('Unexpected email send failure', err);
            throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.EMAIL_SEND_FAILED, 'Unable to send the verification email. Please try again later.');
        }
    }
    buildText(purpose, otp, expiresInMinutes) {
        const intro = purpose === 'reset'
            ? 'We received a request to reset your password. Your verification code is:'
            : 'Verify your email to activate your account. Your verification code is:';
        return `${intro}\n\n${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you did not request this code, you can safely ignore this email.`;
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map