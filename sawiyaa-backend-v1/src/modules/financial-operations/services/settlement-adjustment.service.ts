import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SettlementAdjustmentType, PractitionerSettlementStatus } from '@prisma/client';

@Injectable()
export class SettlementAdjustmentService {
  constructor() {}

  async apply(input: {
    db: Prisma.TransactionClient;
    settlementId: string;
    type: SettlementAdjustmentType;
    amount: Prisma.Decimal;
    reason: string;
    actorUserId: string;
  }) {
    if (input.amount.lte(0) || !input.reason.trim()) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidSettlementAdjustment',
        error: 'FINANCIAL_OPERATIONS_INVALID_SETTLEMENT_ADJUSTMENT',
      });
    }

    const settlement = await input.db.practitionerSettlement.findUnique({
      where: { id: input.settlementId },
      select: {
        id: true,
        currencyCode: true,
        amountGross: true,
        amountAdjustments: true,
        status: true,
      },
    });
    if (!settlement || settlement.status !== PractitionerSettlementStatus.UNDER_REVIEW) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.settlementNotAdjustable',
        error: 'FINANCIAL_OPERATIONS_SETTLEMENT_NOT_ADJUSTABLE',
      });
    }

    const remaining = new Prisma.Decimal(settlement.amountGross)
      .sub(settlement.amountAdjustments)
      .sub(input.amount);
    if (remaining.lt(0)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.adjustmentExceedsSettlement',
        error: 'FINANCIAL_OPERATIONS_ADJUSTMENT_EXCEEDS_SETTLEMENT',
      });
    }

    const adjustment = await input.db.settlementAdjustment.create({
      data: {
        settlementId: input.settlementId,
        type: input.type,
        amount: input.amount,
        currencyCode: settlement.currencyCode,
        reason: input.reason.trim(),
        createdByUserId: input.actorUserId,
      },
    });
    await input.db.practitionerSettlement.update({
      where: { id: settlement.id },
      data: {
        amountAdjustments: { increment: input.amount },
        amountNet: remaining,
        finalWalletCredit: remaining,
      },
    });

    return adjustment;
  }
}
