"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsImageUrl = IsImageUrl;
const class_validator_1 = require("class-validator");
function IsImageUrl(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isImageUrl',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value) {
                    if (typeof value !== 'string')
                        return false;
                    if (value.startsWith('/'))
                        return value.length >= 2;
                    return /^https?:\/\/.+/.test(value);
                },
                defaultMessage() {
                    return 'A valid image URL (absolute or /-relative) is required';
                },
            },
        });
    };
}
//# sourceMappingURL=is-image-url.validator.js.map