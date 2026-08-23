import { PaymentProvider } from '@prisma/client';
import { resolvePaymentRegionalResolution } from './payment-region.resolver';

describe('resolvePaymentRegionalResolution', () => {
  it.each([
    ['EG', 'EG', 'EGP', 'EGYPT_LOCAL'],
    ['EGY', 'EG', 'EGP', 'EGYPT_LOCAL'],
    ['US', 'US', 'USD', 'INTERNATIONAL'],
    ['SA', 'SA', 'USD', 'INTERNATIONAL'],
  ] as const)(
    'resolves request country %s to %s',
    (requestCountryIsoCode, resolvedCountryIsoCode, currencyCode, mode) => {
      expect(
        resolvePaymentRegionalResolution({ requestCountryIsoCode }),
      ).toMatchObject({
        status: 'RESOLVED',
        resolvedCountryIsoCode,
        currencyCode,
        regionalPricingMode: mode,
        provider: PaymentProvider.PAYMOB,
      });
    },
  );

  it('uses both participant countries before trusted request country', () => {
    expect(
      resolvePaymentRegionalResolution({
        requestCountryIsoCode: 'US',
        patientCountryIsoCode: 'EG',
        practitionerCountryIsoCode: 'EG',
      }).currencyCode,
    ).toBe('EGP');

    expect(
      resolvePaymentRegionalResolution({
        requestCountryIsoCode: 'EG',
        patientCountryIsoCode: 'US',
        practitionerCountryIsoCode: 'EG',
      }).currencyCode,
    ).toBe('USD');
  });

  it('resolves participant-country pricing as local only when both participants are in Egypt', () => {
    expect(
      resolvePaymentRegionalResolution({
        patientCountryIsoCode: 'EGY',
        practitionerCountryIsoCode: 'EG',
      }),
    ).toMatchObject({
      currencyCode: 'EGP',
      regionalPricingMode: 'EGYPT_LOCAL',
      resolvedCountryIsoCode: 'EG',
      resolutionSource: 'PARTICIPANT_COUNTRIES',
      fallbackReasonCode: null,
    });

    expect(
      resolvePaymentRegionalResolution({
        patientCountryIsoCode: 'EG',
        practitionerCountryIsoCode: 'SA',
      }),
    ).toMatchObject({
      currencyCode: 'USD',
      regionalPricingMode: 'INTERNATIONAL',
      resolvedCountryIsoCode: null,
      resolutionSource: 'PARTICIPANT_COUNTRIES',
      fallbackReasonCode: null,
    });
  });

  it('defaults missing request country to USD without guessing a country', () => {
    expect(resolvePaymentRegionalResolution({})).toMatchObject({
      status: 'RESOLVED',
      resolvedCountryIsoCode: null,
      currencyCode: 'USD',
      regionalPricingMode: 'INTERNATIONAL',
      provider: PaymentProvider.PAYMOB,
      resolutionSource: 'DEFAULT_USD',
      fallbackReasonCode: 'COUNTRY_UNAVAILABLE',
    });
  });

  it.each(['', 'XX', 'ZZ', 'T1', 'UN', 'UNKNOWN', 'not-a-country'])(
    'defaults unresolved country %s to USD',
    (requestCountryIsoCode) => {
      expect(
        resolvePaymentRegionalResolution({ requestCountryIsoCode }),
      ).toMatchObject({
        status: 'RESOLVED',
        currencyCode: 'USD',
        regionalPricingMode: 'INTERNATIONAL',
        provider: PaymentProvider.PAYMOB,
        resolutionSource: 'DEFAULT_USD',
        fallbackReasonCode: 'COUNTRY_UNAVAILABLE',
      });
    },
  );
});
