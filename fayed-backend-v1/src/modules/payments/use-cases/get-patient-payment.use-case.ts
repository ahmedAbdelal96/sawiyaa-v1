import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentPatientRepository } from '../repositories/payment-patient.repository';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class GetPatientPaymentUseCase {
  constructor(
    private readonly paymentPatientRepository: PaymentPatientRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentMapper: PaymentMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    paymentId: string;
  }) {
    const patient = await this.paymentPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'payments.errors.patientNotFound',
        error: 'PAYMENT_PATIENT_NOT_FOUND',
      });
    }

    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment || payment.patientId !== patient.id) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    return {
      item: this.paymentMapper.toViewModel(payment),
    };
  }
}
