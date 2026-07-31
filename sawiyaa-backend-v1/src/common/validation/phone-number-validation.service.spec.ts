import { BadRequestException } from '@nestjs/common';
import { PhoneNumberValidationService } from './phone-number-validation.service';

describe('PhoneNumberValidationService', () => {
  const service = new PhoneNumberValidationService();

  it.each([
    ['010 1234 5678', 'EG', '+201012345678'],
    ['+20 101 234 5678', 'EG', '+201012345678'],
    ['0020-101-234-5678', 'EG', '+201012345678'],
  ])('normalizes %s to %s', (input, country, expected) => {
    expect(service.validate(input, country)).toMatchObject({
      valid: true,
      e164: expected,
      countryCode: 'EG',
    });
  });

  it.each([
    ['1012345678', 'EG', '+201012345678'],
    ['٠١٠١٢٣٤٥٦٧٨', 'EG', '+201012345678'],
    ['0551234567', 'SA', '+966551234567'],
    ['551234567', 'SA', '+966551234567'],
  ])('normalizes country-aware input %s to %s', (input, country, expected) => {
    const result = service.validate(input, country);
    expect(result.valid && result.e164).toBe(expected);
  });

  it.each([
    [null, 'EG', 'PHONE_REQUIRED'],
    ['01012345678', null, 'PHONE_COUNTRY_REQUIRED'],
    ['010123', 'EG', 'PHONE_INCOMPLETE'],
    ['010123456789012', 'EG', 'PHONE_TOO_LONG'],
    ['+441234567890', 'EG', 'PHONE_COUNTRY_MISMATCH'],
    ['01012345678 ext 2', 'EG', 'PHONE_UNSUPPORTED_FORMAT'],
    ['not a phone', 'EG', 'PHONE_INVALID'],
  ])('rejects invalid input %s', (input, country, code) => {
    expect(service.validate(input, country)).toEqual({ valid: false, code });
  });

  it('raises a structured error for invalid input', () => {
    expect(() => service.assertValid('010123', 'EG')).toThrow(
      BadRequestException,
    );
    try {
      service.assertValid('010123', 'EG');
      throw new Error('expected validation to fail');
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({
        error: 'PHONE_INCOMPLETE',
        messageKey: 'auth.errors.phoneIncomplete',
      });
    }
  });
});
