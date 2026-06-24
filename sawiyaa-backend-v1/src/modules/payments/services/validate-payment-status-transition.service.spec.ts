import { ConflictException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { ValidatePaymentStatusTransitionService } from './validate-payment-status-transition.service';

describe('ValidatePaymentStatusTransitionService', () => {
  const service = new ValidatePaymentStatusTransitionService();

  it('allows created to pending transition', () => {
    expect(() =>
      service.assertCanTransition(PaymentStatus.CREATED, PaymentStatus.PENDING),
    ).not.toThrow();
  });

  it('rejects failed to captured transition', () => {
    expect(() =>
      service.assertCanTransition(PaymentStatus.FAILED, PaymentStatus.CAPTURED),
    ).toThrow(ConflictException);
  });
});
