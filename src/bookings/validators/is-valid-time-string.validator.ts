import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsValidTimeString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidTimeString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (!/^\d{2}:\d{2}$/.test(value)) return false;
          const [h, m] = value.split(':').map(Number);
          return h >= 0 && h <= 23 && m >= 0 && m <= 59;
        },
        defaultMessage(): string {
          return 'A valid time (HH:MM) is required';
        },
      },
    });
  };
}
