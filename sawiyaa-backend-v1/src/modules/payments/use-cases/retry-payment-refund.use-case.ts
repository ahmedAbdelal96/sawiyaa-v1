import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { RequestPaymentRefundUseCase } from './request-payment-refund.use-case';

@Injectable()
export class RetryPaymentRefundUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly requestPaymentRefundUseCase: RequestPaymentRefundUseCase,
  ) {}

  async execute(input: {
    paymentId: string;
    refundId: string;
    actorUserId: string;
  }) {
    const refund = await this.paymentRepository.findRefundById(input.refundId);

    if (!refund || refund.paymentId !== input.paymentId) {
      throw new NotFoundException({
        messageKey: 'payments.errors.refundNotFound',
        error: 'PAYMENT_REFUND_NOT_FOUND',
      });
    }

    return this.requestPaymentRefundUseCase.execute({
      paymentId: input.paymentId,
      actorUserId: input.actorUserId,
      amount: refund.amount.toString(),
      reason: refund.refundReason,
      retryRefundId: refund.id,
    });
  }
}
