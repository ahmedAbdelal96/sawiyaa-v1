import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CalculatePractitionerPayoutConversionService } from './calculate-practitioner-payout-conversion.service';

describe('CalculatePractitionerPayoutConversionService', () => {
  const service = new CalculatePractitionerPayoutConversionService();

  it('keeps same-currency payouts unchanged without an exchange rate', () => {
    const result = service.calculate({
      sourceAmount: '70.00',
      sourceCurrencyCode: 'USD',
      payoutCurrencyCode: 'USD',
    });

    expect(result.calculatedPayoutAmount.toString()).toBe('70');
    expect(result.exchangeRateEgpPerUsd).toBeNull();
  });

  it('multiplies USD to EGP using the canonical rate direction', () => {
    const result = service.calculate({
      sourceAmount: '70.00',
      sourceCurrencyCode: 'USD',
      payoutCurrencyCode: 'EGP',
      exchangeRateEgpPerUsd: '50',
    });

    expect(result.calculatedPayoutAmount.toString()).toBe('3500');
  });

  it('divides EGP to USD using the canonical rate direction', () => {
    const result = service.calculate({
      sourceAmount: '3500.00',
      sourceCurrencyCode: 'EGP',
      payoutCurrencyCode: 'USD',
      exchangeRateEgpPerUsd: '50',
    });

    expect(result.calculatedPayoutAmount.toString()).toBe('70');
  });

  it.each(['0', '-1', '1000001'])('rejects an invalid rate: %s', (rate) => {
    expect(() => service.calculate({
      sourceAmount: new Prisma.Decimal('10'),
      sourceCurrencyCode: 'USD',
      payoutCurrencyCode: 'EGP',
      exchangeRateEgpPerUsd: rate,
    })).toThrow(BadRequestException);
  });

  it('requires a rate for cross-currency conversion', () => {
    expect(() => service.calculate({
      sourceAmount: '10',
      sourceCurrencyCode: 'USD',
      payoutCurrencyCode: 'EGP',
    })).toThrow(BadRequestException);
  });
});
