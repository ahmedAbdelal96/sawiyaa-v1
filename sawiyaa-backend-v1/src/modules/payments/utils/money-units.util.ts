import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const MINOR_UNIT_CURRENCIES = new Set(['EGP', 'USD']);

/** Converts persisted major-unit money to gateway minor units without floats. */
export function toGatewayMinorUnits(
  amount: string | Prisma.Decimal,
  currencyCode: string,
): number {
  const currency = currencyCode.trim().toUpperCase();
  if (!MINOR_UNIT_CURRENCIES.has(currency)) {
    throw new BadRequestException({ error: 'UNSUPPORTED_PAYMENT_CURRENCY' });
  }

  const decimal = new Prisma.Decimal(amount).toDecimalPlaces(2);
  const minor = decimal.mul(new Prisma.Decimal(100));
  if (!minor.isInteger() || !minor.lte(Number.MAX_SAFE_INTEGER)) {
    throw new BadRequestException({
      error: 'PAYMENT_AMOUNT_PRECISION_INVALID',
    });
  }

  return minor.toNumber();
}

export function normalizeGatewayCurrency(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const currency = value.trim().toUpperCase();
  return MINOR_UNIT_CURRENCIES.has(currency) ? currency : null;
}

export function gatewayMoneyMatchesPayment(input: {
  amountMinor: unknown;
  currencyCode: unknown;
  expectedAmount: string | Prisma.Decimal;
  expectedCurrencyCode: string;
}): boolean {
  const actualAmount =
    typeof input.amountMinor === 'number' ||
    typeof input.amountMinor === 'string'
      ? new Prisma.Decimal(input.amountMinor)
      : null;
  const expectedAmount = new Prisma.Decimal(
    toGatewayMinorUnits(input.expectedAmount, input.expectedCurrencyCode),
  );
  const actualCurrency = normalizeGatewayCurrency(input.currencyCode);
  return Boolean(
    actualAmount &&
    actualAmount.eq(expectedAmount) &&
    actualCurrency === input.expectedCurrencyCode.trim().toUpperCase(),
  );
}
