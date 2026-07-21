import { BadRequestException } from '@nestjs/common';
import { IbanValidationService } from './iban-validation.service';
import { PractitionerPayoutDestinationValidationService } from './practitioner-payout-destination-validation.service';
import {
  IBAN_REGISTRY,
  IBAN_REGISTRY_RELEASE,
  IBAN_REGISTRY_RELEASE_DATE,
  IBAN_REGISTRY_SOURCE,
} from '../constants/iban-registry';

describe('IbanValidationService', () => {
  const service = new IbanValidationService();

  it('matches the documented SWIFT Release 102 country registry', () => {
    expect({
      source: IBAN_REGISTRY_SOURCE,
      release: IBAN_REGISTRY_RELEASE,
      releaseDate: IBAN_REGISTRY_RELEASE_DATE,
      countries: Object.keys(IBAN_REGISTRY).sort(),
    }).toEqual({
      source: 'SWIFT ISO 13616 IBAN Registry',
      release: '102',
      releaseDate: '2026-06',
      countries: [
        'AD',
        'AE',
        'AL',
        'AT',
        'AZ',
        'BA',
        'BE',
        'BG',
        'BH',
        'BI',
        'BR',
        'BY',
        'CH',
        'CR',
        'CY',
        'CZ',
        'DE',
        'DJ',
        'DK',
        'DO',
        'EE',
        'EG',
        'ES',
        'FI',
        'FK',
        'FO',
        'FR',
        'GB',
        'GE',
        'GI',
        'GL',
        'GR',
        'GT',
        'HN',
        'HR',
        'HU',
        'IE',
        'IL',
        'IQ',
        'IS',
        'IT',
        'JO',
        'KW',
        'KZ',
        'LB',
        'LC',
        'LI',
        'LT',
        'LU',
        'LV',
        'LY',
        'MC',
        'MD',
        'ME',
        'MK',
        'MN',
        'MR',
        'MT',
        'MU',
        'NI',
        'NL',
        'NO',
        'OM',
        'PK',
        'PL',
        'PS',
        'PT',
        'QA',
        'RO',
        'RS',
        'RU',
        'SA',
        'SC',
        'SD',
        'SE',
        'SI',
        'SK',
        'SM',
        'SO',
        'ST',
        'SV',
        'TL',
        'TN',
        'TR',
        'UA',
        'VA',
        'VG',
        'XK',
        'YE',
      ],
    });
  });

  it.each([
    ['EG700019000500000000002631800', 'EG'],
    ['SA0380000000608010167519', 'SA'],
    ['AE070331234567890123456', 'AE'],
    ['GB82WEST12345698765432', 'GB'],
  ])('accepts a valid %s IBAN', (iban, countryCode) => {
    expect(service.validate(iban, countryCode)).toMatchObject({
      valid: true,
      canonical: iban,
      countryCode,
    });
  });

  it('normalizes formatted input and validates the checksum', () => {
    expect(
      service.validate('EG70 0019-0005 0000 0000 0026 31800', 'EG').valid,
    ).toBe(true);
    expect(
      service.validate('EG710019000500000000002631800', 'EG'),
    ).toMatchObject({
      valid: false,
      code: 'IBAN_INVALID_CHECKSUM',
    });
  });

  it.each([
    ['GB82WEST12345698765432', 'IBAN_COUNTRY_MISMATCH'],
    ['SA0380000000608010167519', 'IBAN_COUNTRY_MISMATCH'],
    ['EG380019000500000000263180', 'IBAN_INVALID_LENGTH'],
  ])('rejects invalid IBAN input: %s', (iban, code) => {
    expect(service.validate(iban, 'EG')).toMatchObject({ valid: false, code });
  });

  it('maps validation failures to localized error keys', () => {
    try {
      service.assertValid('EG710019000500000000002631800', 'EG');
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        messageKey: 'practitioners.errors.ibanInvalidChecksum',
      });
    }
  });
});

describe('PractitionerPayoutDestinationValidationService', () => {
  const service = new PractitionerPayoutDestinationValidationService(
    new IbanValidationService(),
  );

  it('rejects numeric-only beneficiary names', () => {
    expect(() =>
      service.validate({
        methodType: 'IBAN',
        countryCode: 'EG',
        accountHolderName: '123456',
        iban: 'EG700019000500000000002631800',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects stale fields from another payout method', () => {
    expect(() =>
      service.validate({
        methodType: 'IBAN',
        countryCode: 'EG',
        accountHolderName: 'Test Beneficiary',
        iban: 'EG700019000500000000002631800',
        walletIdentifier: '+201012345678',
      }),
    ).toThrow(BadRequestException);
  });

  it('normalizes and validates Egyptian wallet identifiers', () => {
    expect(() =>
      service.validate({
        methodType: 'WALLET',
        countryCode: 'EG',
        accountHolderName: 'Test Beneficiary',
        walletProvider: 'VODAFONE_CASH',
        walletIdentifier: '01012345678',
      }),
    ).not.toThrow();
    expect(service.normalizeWalletIdentifier('01012345678', 'EG')).toBe(
      '+201012345678',
    );
  });
});
