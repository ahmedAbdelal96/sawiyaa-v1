import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type SupportedPayoutCurrency = 'USD' | 'EGP';

export type PractitionerPayoutConversion = {
  sourceAmount: Prisma.Decimal;
  sourceCurrencyCode: SupportedPayoutCurrency;
  payoutCurrencyCode: SupportedPayoutCurrency;
  exchangeRateEgpPerUsd: Prisma.Decimal | null;
  calculatedPayoutAmount: Prisma.Decimal;
};

const MIN_RATE = new Prisma.Decimal('0.0001');
const MAX_RATE = new Prisma.Decimal('1000000');

@Injectable()
export class CalculatePractitionerPayoutConversionService {
  calculate(input: {
    sourceAmount: Prisma.Decimal | string;
    sourceCurrencyCode: string;
    payoutCurrencyCode: string;
    exchangeRateEgpPerUsd?: Prisma.Decimal | string | null;
  }): PractitionerPayoutConversion {
    const sourceCurrencyCode = this.currency(input.sourceCurrencyCode);
    const payoutCurrencyCode = this.currency(input.payoutCurrencyCode);
    const sourceAmount = new Prisma.Decimal(input.sourceAmount).toDecimalPlaces(2);

    if (sourceAmount.lte(0)) {
      throw new BadRequestException('Practitioner payout source amount must be greater than zero');
    }

    const isSameCurrency = sourceCurrencyCode === payoutCurrencyCode;
    if (isSameCurrency) {
      if (input.exchangeRateEgpPerUsd !== undefined && input.exchangeRateEgpPerUsd !== null && String(input.exchangeRateEgpPerUsd).trim() !== '') {
        throw new BadRequestException('Exchange rate is not applicable for same-currency payout');
      }
      return {
        sourceAmount,
        sourceCurrencyCode,
        payoutCurrencyCode,
        exchangeRateEgpPerUsd: null,
        calculatedPayoutAmount: sourceAmount,
      };
    }

    if (sourceCurrencyCode !== 'USD' && sourceCurrencyCode !== 'EGP') {
      throw new BadRequestException('Unsupported payout source currency');
    }
    if (payoutCurrencyCode !== 'USD' && payoutCurrencyCode !== 'EGP') {
      throw new BadRequestException('Unsupported payout currency');
    }

    const rawRate = input.exchangeRateEgpPerUsd;
    if (rawRate === undefined || rawRate === null || String(rawRate).trim() === '') {
      throw new BadRequestException({ messageKey: 'financialOperations.errors.exchangeRateRequired', error: 'FINANCIAL_OPERATIONS_EXCHANGE_RATE_REQUIRED' });
    }
    const exchangeRateEgpPerUsd = new Prisma.Decimal(rawRate);
    if (exchangeRateEgpPerUsd.lte(0) || exchangeRateEgpPerUsd.lt(MIN_RATE) || exchangeRateEgpPerUsd.gt(MAX_RATE)) {
      throw new BadRequestException('Exchange rate must be between 0.0001 and 1000000 EGP per USD');
    }

    const calculatedPayoutAmount = sourceCurrencyCode === 'USD'
      ? sourceAmount.mul(exchangeRateEgpPerUsd).toDecimalPlaces(2)
      : sourceAmount.div(exchangeRateEgpPerUsd).toDecimalPlaces(2);

    return {
      sourceAmount,
      sourceCurrencyCode,
      payoutCurrencyCode,
      exchangeRateEgpPerUsd,
      calculatedPayoutAmount,
    };
  }

  private currency(value: string): SupportedPayoutCurrency {
    const currency = value.trim().toUpperCase();
    if (currency !== 'USD' && currency !== 'EGP') {
      throw new BadRequestException('Only USD and EGP payout currencies are supported');
    }
    return currency;
  }
}
