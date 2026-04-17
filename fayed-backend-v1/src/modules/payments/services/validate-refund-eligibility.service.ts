import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PaymentStatus, RefundStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class ValidateRefundEligibilityService {
  assertPaymentRefundable(paymentStatus: PaymentStatus): void {
    const refundableStatuses: PaymentStatus[] = [
      PaymentStatus.CAPTURED,
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.REFUND_PENDING,
    ];

    if (!refundableStatuses.includes(paymentStatus)) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentNotRefundable',
        error: 'PAYMENT_NOT_REFUNDABLE',
        messageParams: {
          status: paymentStatus,
        },
      });
    }
  }

  assertNoActiveRefund(activeRefund: { id: string } | null): void {
    if (!activeRefund) {
      return;
    }

    throw new ConflictException({
      messageKey: 'payments.errors.refundAlreadyInProgress',
      error: 'PAYMENT_REFUND_ALREADY_IN_PROGRESS',
    });
  }

  resolveRefundAmount(input: {
    paymentAmountTotal: Prisma.Decimal;
    alreadyRefundedAmount: Prisma.Decimal;
    requestedAmount?: string | null;
  }) {
    const paymentTotal = new Prisma.Decimal(input.paymentAmountTotal);
    const alreadyRefunded = new Prisma.Decimal(input.alreadyRefundedAmount);
    const remaining = paymentTotal.sub(alreadyRefunded);

    if (remaining.lte(0)) {
      throw new ConflictException({
        messageKey: 'payments.errors.paymentAlreadyFullyRefunded',
        error: 'PAYMENT_ALREADY_FULLY_REFUNDED',
      });
    }

    const amount = input.requestedAmount
      ? new Prisma.Decimal(input.requestedAmount)
      : remaining;

    if (amount.lte(0)) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidRefundAmount',
        error: 'PAYMENT_INVALID_REFUND_AMOUNT',
      });
    }

    if (amount.gt(remaining)) {
      throw new BadRequestException({
        messageKey: 'payments.errors.refundAmountExceedsRemaining',
        error: 'PAYMENT_REFUND_AMOUNT_EXCEEDS_REMAINING',
        messageParams: {
          remainingAmount: remaining.toFixed(2),
        },
      });
    }

    return {
      amount: amount.toDecimalPlaces(2),
      remaining: remaining.toDecimalPlaces(2),
      isFullRefund: amount.eq(remaining),
    };
  }

  assertRetryableRefundStatus(status: RefundStatus): void {
    if (status !== RefundStatus.FAILED) {
      throw new BadRequestException({
        messageKey: 'payments.errors.refundNotRetryable',
        error: 'PAYMENT_REFUND_NOT_RETRYABLE',
        messageParams: { status },
      });
    }
  }
}
