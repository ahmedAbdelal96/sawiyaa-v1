import {
  isPositiveAcademyPriceAmount,
  resolveAcademyCheckoutPricing,
} from './academy-pricing.util';

describe('academy pricing', () => {
  it.each(['20', '20.00', '0.01'])('accepts a positive selected amount: %s', (amount) => {
    expect(isPositiveAcademyPriceAmount(amount)).toBe(true);
  });

  it.each([null, '0', '0.00', '-1', 'invalid'])('rejects unavailable selected amounts: %s', (amount) => {
    expect(isPositiveAcademyPriceAmount(amount)).toBe(false);
  });

  it('does not borrow the other regional price when the selected price is unavailable', () => {
    expect(
      resolveAcademyCheckoutPricing({
        priceAmountEgp: { toString: () => '500.00' },
        priceAmountUsd: { toString: () => '0.00' },
        priceAmount: null,
        currencyCode: null,
        resolvedCountryCode: 'US',
      }),
    ).toMatchObject({ amount: null, currencyCode: null });
  });

  it('returns the selected positive regional amount and currency', () => {
    expect(
      resolveAcademyCheckoutPricing({
        priceAmountEgp: { toString: () => '500.00' },
        priceAmountUsd: { toString: () => '20.00' },
        priceAmount: null,
        currencyCode: null,
        resolvedCountryCode: 'US',
      }),
    ).toMatchObject({ amount: '20.00', currencyCode: 'USD' });
  });
});
