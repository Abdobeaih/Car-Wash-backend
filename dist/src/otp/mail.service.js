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
const nodemailer_1 = require("nodemailer");
const otp_errors_1 = require("./otp-errors");
const DEFAULT_FROM_NAME = 'Mobile Car Care';
let MailService = MailService_1 = class MailService {
    configService;
    logger = new common_1.Logger(MailService_1.name);
    transporter;
    from;
    devLogOtp;
    constructor(configService) {
        this.configService = configService;
        const host = this.configService.get('SMTP_HOST') ?? 'smtp.gmail.com';
        const port = Number(this.configService.get('SMTP_PORT') ?? 465);
        const user = this.configService.get('SMTP_USER');
        const pass = this.configService.get('SMTP_PASS');
        this.from =
            this.configService.get('MAIL_FROM') ??
                (user ? `${DEFAULT_FROM_NAME} <${user}>` : DEFAULT_FROM_NAME);
        this.devLogOtp = this.configService.get('SMTP_LOG_OTP') === 'true';
        this.transporter =
            user && pass
                ? (0, nodemailer_1.createTransport)({
                    host,
                    port,
                    secure: port === 465,
                    auth: { user, pass },
                })
                : null;
    }
    async onModuleInit() {
        if (!this.transporter) {
            this.logger.warn('SMTP is not configured (SMTP_USER/SMTP_PASS missing). OTP emails will not be sent.');
            return;
        }
        try {
            await this.transporter.verify();
            this.logger.log('SMTP connection verified successfully.');
        }
        catch (err) {
            this.logger.error('SMTP connection verification failed. Check SMTP_USER/SMTP_PASS (Gmail requires an App Password).', err);
        }
    }
    async onModuleDestroy() {
        if (this.transporter) {
            await this.transporter.close();
        }
    }
    async sendOtpEmail({ to, purpose, otp, expiresInMinutes }) {
        const subject = purpose === 'reset' ? 'Reset your password' : 'Verify your email';
        const text = this.buildText(purpose, otp, expiresInMinutes);
        if (!this.transporter) {
            this.logger.warn('SMTP is not configured (SMTP_USER/SMTP_PASS). Email for ' + to + ' was not sent.');
            return this.handleDeliveryFailure('SMTP is not configured', to, otp);
        }
        try {
            await this.transporter.sendMail({ from: this.from, to, subject, text });
        }
        catch (err) {
            this.logger.error('Unexpected email send failure', err);
            return this.handleDeliveryFailure('email send failed', to, otp);
        }
    }
    handleDeliveryFailure(reason, to, otp) {
        if (this.devLogOtp && process.env.NODE_ENV !== 'production') {
            this.logger.warn(`[dev] Email delivery unavailable (${reason}). OTP for ${to}: ${otp}`);
            return;
        }
        throw new otp_errors_1.OtpException(otp_errors_1.OtpErrorCode.EMAIL_SEND_FAILED, 'Unable to send the verification email. Please try again later.');
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