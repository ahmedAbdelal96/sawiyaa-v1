import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class ListPaymentRefundsUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentMapper: PaymentMapper,
  ) {}

  async execute(input: { paymentId: string }) {
    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    const refunds = await this.paymentRepository.listRefundsByPaymentId(
      input.paymentId,
    );

    return {
      items: refunds.map((refund) =>
        this.paymentMapper.toRefundViewModel(refund),
      ),
    };
  }
}
