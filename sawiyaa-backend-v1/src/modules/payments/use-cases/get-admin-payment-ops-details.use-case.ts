import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class GetAdminPaymentOpsDetailsUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentMapper: PaymentMapper,
  ) {}

  async execute(input: { paymentId: string }) {
    const payment = await this.paymentRepository.findAdminOpsById(
      input.paymentId,
    );

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    return {
      item: this.paymentMapper.toAdminOpsViewModel(payment as never),
    };
  }
}
