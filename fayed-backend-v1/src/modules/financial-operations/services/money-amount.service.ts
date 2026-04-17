import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class MoneyAmountService {
  toDecimal(value: Prisma.Decimal | string | number | null | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  toFixed(value: Prisma.Decimal | string | number | null | undefined) {
    return this.toDecimal(value).toDecimalPlaces(2).toFixed(2);
  }

  signedAmount(direction: 'CREDIT' | 'DEBIT', amount: Prisma.Decimal | string | number) {
    const decimal = this.toDecimal(amount);
    return direction === 'CREDIT' ? decimal : decimal.negated();
  }
}
