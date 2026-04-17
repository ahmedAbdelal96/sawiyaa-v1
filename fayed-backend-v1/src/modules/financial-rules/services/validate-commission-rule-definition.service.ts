import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MoneyMathService } from './money-math.service';

/**
 * Commission rules remain auditable only when their split is explicit and sums
 * to 100%. The validation lives here so Payments and future Ledger logic can
 * trust every resolved rule snapshot.
 */
@Injectable()
export class ValidateCommissionRuleDefinitionService {
  constructor(private readonly moneyMathService: MoneyMathService) {}

  validate(input: {
    platformRatePercent: Prisma.Decimal | string;
    practitionerRatePercent: Prisma.Decimal | string;
  }) {
    const platformRate = this.moneyMathService.toDecimal(input.platformRatePercent);
    const practitionerRate = this.moneyMathService.toDecimal(
      input.practitionerRatePercent,
    );
    const total = platformRate.add(practitionerRate);

    if (platformRate.isNegative() || practitionerRate.isNegative()) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidCommissionSplit',
        error: 'FINANCIAL_RULE_INVALID_COMMISSION_SPLIT',
      });
    }

    if (!total.equals(new Prisma.Decimal(100))) {
      throw new BadRequestException({
        messageKey: 'financialRules.errors.invalidCommissionSplit',
        error: 'FINANCIAL_RULE_INVALID_COMMISSION_SPLIT',
      });
    }
  }
}
