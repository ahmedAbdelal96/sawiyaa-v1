import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'currencyFormat', async: false })
export class CurrencyFormatConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return true;
    return /^[A-Z]{3}$/.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Currency must be 3 uppercase letters (e.g., EGP, USD)';
  }
}

export function CurrencyFormat(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: CurrencyFormatConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'uppercase', async: false })
export class UppercaseConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return true;
    return value === value.toUpperCase();
  }

  defaultMessage(args: ValidationArguments) {
    return 'Value must be uppercase';
  }
}

export function Uppercase(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: UppercaseConstraint,
    });
  };
}