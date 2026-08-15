"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsValidDateString = IsValidDateString;
const class_validator_1 = require("class-validator");
function IsValidDateString(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isValidDateString',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value) {
                    if (typeof value !== 'string')
                        return false;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
                        return false;
                    const date = new Date(`${value}T00:00:00`);
                    if (Number.isNaN(date.getTime()))
                        return false;
                    const [y, m, d] = value.split('-').map(Number);
                    return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
                },
                defaultMessage() {
                    return 'A valid date (YYYY-MM-DD) is required';
                },
            },
        });
    };
}
//# sourceMappingURL=is-valid-date-string.validator.js.map