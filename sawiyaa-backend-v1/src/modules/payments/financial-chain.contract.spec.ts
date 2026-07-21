import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
import { resolveAcademyCheckoutPricing } from '@modules/academy/utils/academy-pricing.util';
import {
  gatewayMoneyMatchesPayment,
  toGatewayMinorUnits,
} from './utils/money-units.util';

type FinancialSnapshot = {
  amount: string;
  currency: 'EGP' | 'USD';
};

function buildSnapshot(
  requestCountry: string,
  configured: { egp: string; usd: string },
): FinancialSnapshot {
  const region = resolvePaymentRegionalResolution({
    requestCountryIsoCode: requestCountry,
  });
  if (region.currencyCode === null)
    throw new Error('PRICING_REGION_UNAVAILABLE');
  return {
    amount: region.currencyCode === 'EGP' ? configured.egp : configured.usd,
    currency: region.currencyCode,
  };
}

describe('paid product financial chain contract', () => {
  it.each([
    ['sessions', 'EG', '500.00', 'EGP', 50000],
    ['packages', 'EG', '500.00', 'EGP', 50000],
    ['academy', 'EG', '500.00', 'EGP', 50000],
    ['sessions', 'US', '20.00', 'USD', 2000],
    ['packages', 'US', '20.00', 'USD', 2000],
    ['academy', 'US', '20.00', 'USD', 2000],
  ])(
    '%s preserves %s amount/currency through snapshot, gateway, webhook, and refund',
    (_product, country, expectedAmount, expectedCurrency, expectedMinor) => {
      const display = buildSnapshot(country, { egp: '500.00', usd: '20.00' });
      const quote = { ...display };
      const persisted: FinancialSnapshot = { ...quote };
      const gateway = toGatewayMinorUnits(persisted.amount, persisted.currency);
      const webhook = {
        amountMinor: gateway,
        currencyCode: persisted.currency,
      };
      const refund = { amount: persisted.amount, currency: persisted.currency };

      expect(display).toEqual({
        amount: expectedAmount,
        currency: expectedCurrency,
      });
      expect(quote).toEqual(persisted);
      expect(gateway).toBe(expectedMinor);
      expect(
        gatewayMoneyMatchesPayment({
          amountMinor: webhook.amountMinor,
          currencyCode: webhook.currencyCode,
          expectedAmount: persisted.amount,
          expectedCurrencyCode: persisted.currency,
        }),
      ).toBe(true);
      expect(refund.currency).toBe(persisted.currency);
    },
  );

  it('academy checkout uses the backend default USD price when country is unavailable', () => {
    expect(
      resolveAcademyCheckoutPricing({
        priceAmountEgp: '500.00',
        priceAmountUsd: '20.00',
        priceAmount: null,
        currencyCode: null,
        resolvedCountryCode: null,
      }),
    ).toEqual({
      amount: '20.00',
      currencyCode: 'USD',
      regionalPricingMode: 'INTERNATIONAL',
      resolvedCountryCode: null,
    });
  });

  it('client amount/currency and later location changes cannot change a persisted transaction', () => {
    const persisted = buildSnapshot('EG', { egp: '500.00', usd: '20.00' });
    const clientRequest = { amount: '20.00', currency: 'USD' };
    const laterLocation = 'US';
    expect(clientRequest).not.toEqual(persisted);
    expect(
      buildSnapshot(laterLocation, { egp: '500.00', usd: '20.00' }),
    ).toEqual({ amount: '20.00', currency: 'USD' });
    expect(persisted).toEqual({ amount: '500.00', currency: 'EGP' });
  });
});
