"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsValidTimeString = IsValidTimeString;
const class_validator_1 = require("class-validator");
function IsValidTimeString(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isValidTimeString',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value) {
                    if (typeof value !== 'string')
                        return false;
                    if (!/^\d{2}:\d{2}$/.test(value))
                        return false;
                    const [h, m] = value.split(':').map(Number);
                    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
                },
                defaultMessage() {
                    return 'A valid time (HH:MM) is required';
                },
            },
        });
    };
}
//# sourceMappingURL=is-valid-time-string.validator.js.map