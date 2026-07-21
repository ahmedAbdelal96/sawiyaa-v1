import { BadRequestException, Injectable } from '@nestjs/common';
import { CountryCode, parsePhoneNumberWithError } from 'libphonenumber-js/max';

export type PhoneValidationErrorCode =
  | 'PHONE_REQUIRED'
  | 'PHONE_COUNTRY_REQUIRED'
  | 'PHONE_INVALID'
  | 'PHONE_INCOMPLETE'
  | 'PHONE_TOO_LONG'
  | 'PHONE_COUNTRY_MISMATCH'
  | 'PHONE_UNSUPPORTED_FORMAT';

export type PhoneValidationResult =
  | { valid: true; e164: string; countryCode: string }
  | { valid: false; code: PhoneValidationErrorCode };

const EXTENSION_PATTERN = /(?:ext\.?|extension|x|#)\s*\d+$/i;

@Injectable()
export class PhoneNumberValidationService {
  validate(
    phone: string | null | undefined,
    countryCode: string | null | undefined,
  ): PhoneValidationResult {
    const rawPhone = phone?.trim() ?? '';
    const normalizedCountry = countryCode?.trim().toUpperCase() ?? '';

    if (!rawPhone) return { valid: false, code: 'PHONE_REQUIRED' };
    const hasInternationalPrefix =
      rawPhone.startsWith('+') || rawPhone.startsWith('00');
    if (!normalizedCountry && !hasInternationalPrefix) {
      return { valid: false, code: 'PHONE_COUNTRY_REQUIRED' };
    }
    if (EXTENSION_PATTERN.test(rawPhone)) {
      return { valid: false, code: 'PHONE_UNSUPPORTED_FORMAT' };
    }

    let parsed;
    try {
      const parseInput = rawPhone.startsWith('00')
        ? `+${rawPhone.slice(2).replace(/\D/g, '')}`
        : rawPhone;
      parsed = hasInternationalPrefix
        ? parsePhoneNumberWithError(parseInput)
        : parsePhoneNumberWithError(rawPhone, normalizedCountry as CountryCode);
    } catch {
      return { valid: false, code: 'PHONE_INVALID' };
    }

    if (hasInternationalPrefix && normalizedCountry) {
      if (parsed.country && parsed.country !== normalizedCountry) {
        return { valid: false, code: 'PHONE_COUNTRY_MISMATCH' };
      }
    }

    if (!parsed.isPossible()) {
      const digitCount = rawPhone.replace(/\D/g, '').length;
      return {
        valid: false,
        code: digitCount > 14 ? 'PHONE_TOO_LONG' : 'PHONE_INCOMPLETE',
      };
    }
    if (!parsed.isValid()) {
      return { valid: false, code: 'PHONE_INCOMPLETE' };
    }

    const numberType = parsed.getType();
    if (numberType === 'FIXED_LINE') {
      return { valid: false, code: 'PHONE_INVALID' };
    }

    return {
      valid: true,
      e164: parsed.number,
      countryCode: parsed.country ?? normalizedCountry,
    };
  }

  assertValid(
    phone: string | null | undefined,
    countryCode: string | null | undefined,
  ): Extract<PhoneValidationResult, { valid: true }> {
    const result = this.validate(phone, countryCode);
    if (!result.valid) {
      throw new BadRequestException({
        messageKey: `auth.errors.${this.messageKey(result.code)}`,
        error: result.code,
      });
    }
    return result;
  }

  private messageKey(code: PhoneValidationErrorCode): string {
    const keys: Record<PhoneValidationErrorCode, string> = {
      PHONE_REQUIRED: 'phoneRequired',
      PHONE_COUNTRY_REQUIRED: 'phoneCountryRequired',
      PHONE_INVALID: 'phoneInvalid',
      PHONE_INCOMPLETE: 'phoneIncomplete',
      PHONE_TOO_LONG: 'phoneTooLong',
      PHONE_COUNTRY_MISMATCH: 'phoneCountryMismatch',
      PHONE_UNSUPPORTED_FORMAT: 'phoneUnsupportedFormat',
    };
    return keys[code];
  }
}
