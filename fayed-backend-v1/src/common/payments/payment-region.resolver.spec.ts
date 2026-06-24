import { PaymentProvider } from '@prisma/client';
import { resolvePaymentRegionalResolution } from './payment-region.resolver';

describe('resolvePaymentRegionalResolution', () => {
  it('does not fallback unknown patient country to operating country', () => {
    const result = resolvePaymentRegionalResolution({
      patientCountryIsoCode: null,
      accountCountryIsoCode: null,
      checkoutCountryIsoCode: null,
      operatingCountryIsoCode: 'EGY',
    });

    expect(result.resolvedCountryIsoCode).toBeNull();
    expect(result.regionalPricingMode).toBe('INTERNATIONAL');
    expect(result.currencyCode).toBe('USD');
    expect(result.provider).toBe(PaymentProvider.PAYMOB);
  });

  it('routes egypt only when patient/checkout country is explicitly egypt', () => {
    const result = resolvePaymentRegionalResolution({
      patientCountryIsoCode: 'EGY',
      operatingCountryIsoCode: 'USA',
    });

    expect(result.resolvedCountryIsoCode).toBe('EGY');
    expect(result.currencyCode).toBe('EGP');
    expect(result.provider).toBe(PaymentProvider.PAYMOB);
  });
});
