import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MoneyAmountService } from './money-amount.service';

/**
 * Ledger posting must consume already resolved snapshots from Payment.
 * This extractor prefers the stored financial breakdown payload and only falls
 * back to payment snapshot fields when older data is missing a nested payload.
 */
@Injectable()
export class ExtractPaymentLedgerBreakdownService {
  constructor(private readonly moneyAmountService: MoneyAmountService) {}

  extract(payment: {
    amountTotal: Prisma.Decimal;
    currencyCode: string;
    commissionPlatformRatePercent: Prisma.Decimal | null;
    metadataJson: Prisma.JsonValue | null;
  }) {
    const metadata = (payment.metadataJson ?? {}) as Record<string, unknown>;
    const financialBreakdown =
      metadata.financialBreakdown &&
      typeof metadata.financialBreakdown === 'object'
        ? (metadata.financialBreakdown as Record<string, unknown>)
        : null;

    const practitionerShareAmount = this.readMoney(financialBreakdown, 'practitionerShareAmount');
    const platformCommissionAmount = this.readMoney(
      financialBreakdown,
      'platformCommissionAmount',
    );

    if (practitionerShareAmount && platformCommissionAmount) {
      return {
        practitionerShareAmount,
        platformCommissionAmount,
        currencyCode: payment.currencyCode,
      };
    }

    if (!payment.commissionPlatformRatePercent) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.paymentSnapshotsIncomplete',
        error: 'FINANCIAL_OPERATIONS_PAYMENT_SNAPSHOTS_INCOMPLETE',
      });
    }

    const platformCommission = this.moneyAmountService
      .toDecimal(payment.amountTotal)
      .mul(payment.commissionPlatformRatePercent)
      .div(100)
      .toDecimalPlaces(2);
    const practitionerShare = this.moneyAmountService
      .toDecimal(payment.amountTotal)
      .sub(platformCommission)
      .toDecimalPlaces(2);

    return {
      practitionerShareAmount: practitionerShare.toFixed(2),
      platformCommissionAmount: platformCommission.toFixed(2),
      currencyCode: payment.currencyCode,
    };
  }

  private readMoney(
    breakdown: Record<string, unknown> | null,
    key: string,
  ): string | null {
    if (!breakdown) {
      return null;
    }

    const value = breakdown[key];

    return typeof value === 'string' ? value : null;
  }
}
