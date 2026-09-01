"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpException = exports.OtpErrorCode = void 0;
const common_1 = require("@nestjs/common");
var OtpErrorCode;
(function (OtpErrorCode) {
    OtpErrorCode["NOT_FOUND"] = "OTP_NOT_FOUND";
    OtpErrorCode["INVALID"] = "OTP_INVALID";
    OtpErrorCode["EXPIRED"] = "OTP_EXPIRED";
    OtpErrorCode["ALREADY_USED"] = "OTP_ALREADY_USED";
    OtpErrorCode["MAX_ATTEMPTS"] = "OTP_MAX_ATTEMPTS";
    OtpErrorCode["RESEND_TOO_SOON"] = "OTP_RESEND_TOO_SOON";
    OtpErrorCode["RATE_LIMITED"] = "OTP_RATE_LIMITED";
    OtpErrorCode["EMAIL_SEND_FAILED"] = "EMAIL_SEND_FAILED";
})(OtpErrorCode || (exports.OtpErrorCode = OtpErrorCode = {}));
class OtpException extends common_1.HttpException {
    code;
    constructor(code, message) {
        super({ statusCode: common_1.HttpStatus.BAD_REQUEST, message, otpCode: code }, common_1.HttpStatus.BAD_REQUEST);
        this.code = code;
    }
}
exports.OtpException = OtpException;
//# sourceMappingURL=otp-errors.js.map