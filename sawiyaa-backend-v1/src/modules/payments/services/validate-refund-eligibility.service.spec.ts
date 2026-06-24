import { BadRequestException, ConflictException } from '@nestjs/common';
import { PaymentStatus, Prisma, RefundStatus } from '@prisma/client';
import { ValidateRefundEligibilityService } from './validate-refund-eligibility.service';

describe('ValidateRefundEligibilityService', () => {
  const service = new ValidateRefundEligibilityService();

  it('allows refundable payment statuses', () => {
    expect(() =>
      service.assertPaymentRefundable(PaymentStatus.CAPTURED),
    ).not.toThrow();
    expect(() =>
      service.assertPaymentRefundable(PaymentStatus.PARTIALLY_REFUNDED),
    ).not.toThrow();
  });

  it('rejects terminal non-refundable status', () => {
    expect(() => service.assertPaymentRefundable(PaymentStatus.FAILED)).toThrow(
      BadRequestException,
    );
  });

  it('rejects duplicate active refund', () => {
    expect(() => service.assertNoActiveRefund({ id: 'refund_1' })).toThrow(
      ConflictException,
    );
  });

  it('resolves full refund amount when amount is omitted', () => {
    const result = service.resolveRefundAmount({
      paymentAmountTotal: new Prisma.Decimal('500.00'),
      alreadyRefundedAmount: new Prisma.Decimal('200.00'),
      requestedAmount: null,
    });

    expect(result.amount.toFixed(2)).toBe('300.00');
    expect(result.isFullRefund).toBe(true);
  });

  it('rejects over-refund amount', () => {
    expect(() =>
      service.resolveRefundAmount({
        paymentAmountTotal: new Prisma.Decimal('500.00'),
        alreadyRefundedAmount: new Prisma.Decimal('450.00'),
        requestedAmount: '100.00',
      }),
    ).toThrow(BadRequestException);
  });

  it('enforces retry only for failed refund', () => {
    expect(() =>
      service.assertRetryableRefundStatus(RefundStatus.PROCESSING),
    ).toThrow(BadRequestException);
    expect(() =>
      service.assertRetryableRefundStatus(RefundStatus.FAILED),
    ).not.toThrow();
  });
});
