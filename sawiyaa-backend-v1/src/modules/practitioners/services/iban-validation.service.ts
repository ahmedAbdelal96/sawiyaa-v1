import { BadRequestException, Injectable } from '@nestjs/common';
import { IBAN_REGISTRY } from '../constants/iban-registry';

export type IbanValidationCode =
  | 'IBAN_REQUIRED'
  | 'IBAN_INVALID_CHARACTERS'
  | 'IBAN_UNSUPPORTED_COUNTRY'
  | 'IBAN_COUNTRY_MISMATCH'
  | 'IBAN_INVALID_LENGTH'
  | 'IBAN_INVALID_BBAN_FORMAT'
  | 'IBAN_INVALID_CHECKSUM';

export type IbanValidationResult = {
  valid: boolean;
  canonical: string;
  countryCode: string;
  code?: IbanValidationCode;
};

@Injectable()
export class IbanValidationService {
  private readonly messageKeyByCode: Record<IbanValidationCode, string> = {
    IBAN_REQUIRED: 'ibanRequired',
    IBAN_INVALID_CHARACTERS: 'ibanInvalidCharacters',
    IBAN_UNSUPPORTED_COUNTRY: 'ibanUnsupportedCountry',
    IBAN_COUNTRY_MISMATCH: 'ibanCountryMismatch',
    IBAN_INVALID_LENGTH: 'ibanInvalidLength',
    IBAN_INVALID_BBAN_FORMAT: 'ibanInvalidBbanFormat',
    IBAN_INVALID_CHECKSUM: 'ibanInvalidChecksum',
  };
  normalize(input: string | null | undefined): string {
    return (input ?? '')
      .trim()
      .replace(/[\s-]+/g, '')
      .toUpperCase();
  }

  validate(
    input: string | null | undefined,
    expectedCountry?: string | null,
  ): IbanValidationResult {
    const canonical = this.normalize(input);
    const countryCode = canonical.slice(0, 2);
    const fail = (code: IbanValidationCode): IbanValidationResult => ({
      valid: false,
      canonical,
      countryCode,
      code,
    });

    if (!canonical) return fail('IBAN_REQUIRED');
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(canonical)) {
      return fail('IBAN_INVALID_CHARACTERS');
    }

    const definition = IBAN_REGISTRY[countryCode];
    if (!definition) return fail('IBAN_UNSUPPORTED_COUNTRY');
    if (expectedCountry?.trim().toUpperCase() !== countryCode) {
      return fail('IBAN_COUNTRY_MISMATCH');
    }
    if (canonical.length !== definition.length) {
      return fail('IBAN_INVALID_LENGTH');
    }
    if (!definition.bbanPattern.test(canonical.slice(4))) {
      return fail('IBAN_INVALID_BBAN_FORMAT');
    }
    if (!this.isValidChecksum(canonical)) {
      return fail('IBAN_INVALID_CHECKSUM');
    }

    return { valid: true, canonical, countryCode };
  }

  assertValid(
    input: string | null | undefined,
    expectedCountry?: string | null,
  ) {
    const result = this.validate(input, expectedCountry);
    if (!result.valid) {
      throw new BadRequestException({
        messageKey: `practitioners.errors.${this.messageKeyByCode[result.code!]}`,
        error: result.code,
        details: { countryCode: result.countryCode || null },
      });
    }
    return result;
  }

  formatForDisplay(input: string | null | undefined) {
    const canonical = this.normalize(input);
    return canonical.replace(/.{1,4}/g, (group) => `${group} `).trim();
  }

  mask(input: string | null | undefined) {
    const canonical = this.normalize(input);
    if (!canonical) return null;
    if (canonical.length <= 8)
      return `${canonical.slice(0, 2)} •••• ${canonical.slice(-2)}`;
    return `${canonical.slice(0, 4)} •••• •••• ${canonical.slice(-4)}`;
  }

  private isValidChecksum(canonical: string) {
    const rearranged = `${canonical.slice(4)}${canonical.slice(0, 4)}`;
    let remainder = 0;
    for (const char of rearranged) {
      const value = /[A-Z]/.test(char) ? char.charCodeAt(0) - 55 : Number(char);
      const digits = String(value);
      for (const digit of digits) {
        remainder = (remainder * 10 + Number(digit)) % 97;
      }
    }
    return remainder === 1;
  }
}
