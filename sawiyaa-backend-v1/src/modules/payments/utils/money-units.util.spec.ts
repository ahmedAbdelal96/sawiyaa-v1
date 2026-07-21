import {
  gatewayMoneyMatchesPayment,
  toGatewayMinorUnits,
} from './money-units.util';

describe('money gateway units', () => {
  it.each([
    ['EGP', '1250.00', 125000],
    ['USD', '19.99', 1999],
  ])('converts %s major units exactly', (currency, amount, expected) => {
    expect(toGatewayMinorUnits(amount, currency)).toBe(expected);
  });

  it('does not use floating-point multiplication', () => {
    expect(toGatewayMinorUnits('10.10', 'USD')).toBe(1010);
  });

  it('matches webhook money only when amount and currency both match', () => {
    expect(
      gatewayMoneyMatchesPayment({
        amountMinor: 125000,
        currencyCode: 'EGP',
        expectedAmount: '1250.00',
        expectedCurrencyCode: 'EGP',
      }),
    ).toBe(true);
    expect(
      gatewayMoneyMatchesPayment({
        amountMinor: 125000,
        currencyCode: 'USD',
        expectedAmount: '1250.00',
        expectedCurrencyCode: 'EGP',
      }),
    ).toBe(false);
  });
});
