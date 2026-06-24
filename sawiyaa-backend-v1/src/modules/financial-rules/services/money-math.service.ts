import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type DecimalLike = Prisma.Decimal | string | number | { toString(): string };

@Injectable()
export class MoneyMathService {
  toDecimal(value: DecimalLike): Prisma.Decimal {
    return value instanceof Prisma.Decimal
      ? value
      : new Prisma.Decimal(
          typeof value === 'object' ? value.toString() : value,
        );
  }

  roundMoney(value: DecimalLike): Prisma.Decimal {
    return this.toDecimal(value).toDecimalPlaces(2);
  }

  add(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
    return this.roundMoney(this.toDecimal(a).add(this.toDecimal(b)));
  }

  subtract(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
    return this.roundMoney(this.toDecimal(a).sub(this.toDecimal(b)));
  }

  percentOf(amount: DecimalLike, percent: DecimalLike): Prisma.Decimal {
    return this.roundMoney(
      this.toDecimal(amount).mul(this.toDecimal(percent)).div(100),
    );
  }

  min(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
    return Prisma.Decimal.min(
      this.toDecimal(a),
      this.toDecimal(b),
    ).toDecimalPlaces(2);
  }

  max(a: DecimalLike, b: DecimalLike): Prisma.Decimal {
    return Prisma.Decimal.max(
      this.toDecimal(a),
      this.toDecimal(b),
    ).toDecimalPlaces(2);
  }
}
