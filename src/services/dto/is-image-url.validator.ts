import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsImageUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isImageUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (value.startsWith('/')) return value.length >= 2;
          return /^https?:\/\/.+/.test(value);
        },
        defaultMessage(): string {
          return 'A valid image URL (absolute or /-relative) is required';
        },
      },
    });
  };
}
