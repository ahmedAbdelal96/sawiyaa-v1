import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MoneyAmountService } from './money-amount.service';

export type PackageSessionAllocationSnapshot = {
  patientPayableTotal: Prisma.Decimal;
  platformFinalShare: Prisma.Decimal;
  practitionerFinalShare: Prisma.Decimal;
  platformOriginalShare: Prisma.Decimal;
  practitionerOriginalShare: Prisma.Decimal;
  platformDiscountShare: Prisma.Decimal;
  practitionerDiscountShare: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  sessionCount: number;
  sessionIndex: number;
};

export type PackageSessionAllocationResult = {
  patientPayableAmount: string;
  platformFinalShareAmount: string;
  practitionerFinalShareAmount: string;
  platformOriginalShareAmount: string;
  practitionerOriginalShareAmount: string;
  platformDiscountShareAmount: string;
  practitionerDiscountShareAmount: string;
  discountAmountAmount: string;
  roundingAdjustmentAmount: string;
};

@Injectable()
export class CalculatePackageSessionAllocationService {
  constructor(private readonly moneyAmountService: MoneyAmountService) {}

  allocate(
    snapshot: PackageSessionAllocationSnapshot,
  ): PackageSessionAllocationResult {
    const sessionCount = snapshot.sessionCount;
    const sessionIndex = snapshot.sessionIndex;

    if (!Number.isInteger(sessionCount) || sessionCount <= 0) {
      throw new Error('PACKAGE_SESSION_ALLOCATION_INVALID_SESSION_COUNT');
    }

    if (
      !Number.isInteger(sessionIndex) ||
      sessionIndex <= 0 ||
      sessionIndex > sessionCount
    ) {
      throw new Error('PACKAGE_SESSION_ALLOCATION_INVALID_SESSION_INDEX');
    }

    const patientPayable = this.splitAmount(
      snapshot.patientPayableTotal,
      sessionCount,
      sessionIndex,
    );
    const platformFinalShare = this.splitAmount(
      snapshot.platformFinalShare,
      sessionCount,
      sessionIndex,
    );
    const practitionerFinalShare = this.splitAmount(
      snapshot.practitionerFinalShare,
      sessionCount,
      sessionIndex,
    );
    const platformOriginalShare = this.splitAmount(
      snapshot.platformOriginalShare,
      sessionCount,
      sessionIndex,
    );
    const practitionerOriginalShare = this.splitAmount(
      snapshot.practitionerOriginalShare,
      sessionCount,
      sessionIndex,
    );
    const platformDiscountShare = this.splitAmount(
      snapshot.platformDiscountShare,
      sessionCount,
      sessionIndex,
    );
    const practitionerDiscountShare = this.splitAmount(
      snapshot.practitionerDiscountShare,
      sessionCount,
      sessionIndex,
    );
    const discountAmount = this.splitAmount(
      snapshot.discountAmount,
      sessionCount,
      sessionIndex,
    );

    const totalFinal = this.moneyAmountService
      .toDecimal(platformFinalShare.amount)
      .add(practitionerFinalShare.amount)
      .toDecimalPlaces(2);
    const roundingAdjustment = this.moneyAmountService
      .toDecimal(patientPayable.amount)
      .sub(totalFinal)
      .toDecimalPlaces(2);

    return {
      patientPayableAmount: patientPayable.amount.toFixed(2),
      platformFinalShareAmount: platformFinalShare.amount.toFixed(2),
      practitionerFinalShareAmount: practitionerFinalShare.amount.toFixed(2),
      platformOriginalShareAmount: platformOriginalShare.amount.toFixed(2),
      practitionerOriginalShareAmount:
        practitionerOriginalShare.amount.toFixed(2),
      platformDiscountShareAmount: platformDiscountShare.amount.toFixed(2),
      practitionerDiscountShareAmount:
        practitionerDiscountShare.amount.toFixed(2),
      discountAmountAmount: discountAmount.amount.toFixed(2),
      roundingAdjustmentAmount: roundingAdjustment.toFixed(2),
    };
  }

  private splitAmount(
    total: Prisma.Decimal,
    sessionCount: number,
    sessionIndex: number,
  ) {
    const decimalTotal = this.moneyAmountService
      .toDecimal(total)
      .toDecimalPlaces(2);
    const baseShare = decimalTotal
      .div(sessionCount)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
    const allocatedBefore = baseShare.mul(sessionIndex - 1).toDecimalPlaces(2);
    const amount =
      sessionIndex === sessionCount
        ? decimalTotal.sub(baseShare.mul(sessionCount - 1)).toDecimalPlaces(2)
        : baseShare;

    return {
      amount,
      allocatedBefore,
      total: decimalTotal,
    };
  }
}
