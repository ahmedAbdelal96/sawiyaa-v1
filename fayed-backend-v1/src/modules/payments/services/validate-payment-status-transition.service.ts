import { ConflictException, Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class ValidatePaymentStatusTransitionService {
  private readonly allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.CREATED]: [
      PaymentStatus.PENDING,
      PaymentStatus.REQUIRES_ACTION,
      PaymentStatus.AUTHORIZED,
      PaymentStatus.CAPTURED,
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
      PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.PENDING]: [
      PaymentStatus.REQUIRES_ACTION,
      PaymentStatus.AUTHORIZED,
      PaymentStatus.CAPTURED,
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
      PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.REQUIRES_ACTION]: [
      PaymentStatus.PENDING,
      PaymentStatus.AUTHORIZED,
      PaymentStatus.CAPTURED,
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
      PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.AUTHORIZED]: [
      PaymentStatus.CAPTURED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
      PaymentStatus.EXPIRED,
      PaymentStatus.REFUND_PENDING,
      PaymentStatus.REFUNDED,
    ],
    [PaymentStatus.CAPTURED]: [
      PaymentStatus.REFUND_PENDING,
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.REFUNDED,
    ],
    [PaymentStatus.FAILED]: [],
    [PaymentStatus.CANCELLED]: [],
    [PaymentStatus.EXPIRED]: [],
    [PaymentStatus.REFUND_PENDING]: [
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.REFUNDED,
      PaymentStatus.FAILED,
    ],
    [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
    [PaymentStatus.REFUNDED]: [],
  };

  assertCanTransition(from: PaymentStatus, to: PaymentStatus): void {
    if (from === to) {
      return;
    }

    if (!this.allowedTransitions[from]?.includes(to)) {
      throw new ConflictException({
        messageKey: 'payments.errors.invalidStatusTransition',
        error: 'PAYMENT_INVALID_STATUS_TRANSITION',
        messageParams: { from, to },
      });
    }
  }
}
