import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsValidDateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const date = new Date(`${value}T00:00:00`);
          if (Number.isNaN(date.getTime())) return false;
          const [y, m, d] = value.split('-').map(Number);
          return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
        },
        defaultMessage(): string {
          return 'A valid date (YYYY-MM-DD) is required';
        },
      },
    });
  };
}
