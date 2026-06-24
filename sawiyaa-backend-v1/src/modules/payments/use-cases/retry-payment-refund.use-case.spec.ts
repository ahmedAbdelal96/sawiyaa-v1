import { NotFoundException } from '@nestjs/common';
import { RetryPaymentRefundUseCase } from './retry-payment-refund.use-case';

describe('RetryPaymentRefundUseCase', () => {
  it('retries a failed refund through request use case', async () => {
    const paymentRepository = {
      findRefundById: jest.fn().mockResolvedValue({
        id: 'refund_1',
        paymentId: 'payment_1',
        amount: { toString: () => '100.00' },
        refundReason: 'reason',
      }),
    };
    const requestPaymentRefundUseCase = {
      execute: jest.fn().mockResolvedValue({ item: { id: 'refund_1' } }),
    };
    const useCase = new RetryPaymentRefundUseCase(
      paymentRepository as never,
      requestPaymentRefundUseCase as never,
    );

    await useCase.execute({
      paymentId: 'payment_1',
      refundId: 'refund_1',
      actorUserId: 'admin_1',
    });

    expect(requestPaymentRefundUseCase.execute).toHaveBeenCalledWith({
      paymentId: 'payment_1',
      actorUserId: 'admin_1',
      amount: '100.00',
      reason: 'reason',
      retryRefundId: 'refund_1',
    });
  });

  it('fails when refund does not belong to the payment', async () => {
    const paymentRepository = {
      findRefundById: jest.fn().mockResolvedValue(null),
    };
    const requestPaymentRefundUseCase = {
      execute: jest.fn(),
    };
    const useCase = new RetryPaymentRefundUseCase(
      paymentRepository as never,
      requestPaymentRefundUseCase as never,
    );

    await expect(
      useCase.execute({
        paymentId: 'payment_1',
        refundId: 'refund_x',
        actorUserId: 'admin_1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
