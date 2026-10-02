import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListPatientPaymentsDto } from '../dto/list-patient-payments.dto';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentPatientRepository } from '../repositories/payment-patient.repository';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class ListPatientPaymentsUseCase {
  constructor(
    private readonly paymentPatientRepository: PaymentPatientRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentMapper: PaymentMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    query: ListPatientPaymentsDto;
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

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;
    const dateFrom = input.query.dateFrom ? new Date(input.query.dateFrom) : undefined;
    const dateTo = input.query.dateTo ? new Date(input.query.dateTo) : undefined;
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException({ messageKey: 'payments.errors.invalidDateRange', error: 'PAYMENT_DATE_RANGE_INVALID' });
    }

    const [payments, totalItems] =
      await this.paymentRepository.listPatientPayments({
        patientId: patient.id,
        status: input.query.status,
        search: input.query.search,
        currencyCode: input.query.currencyCode,
        dateFrom,
        dateTo,
        skip,
        take: limit,
      });

    return {
      items: payments.map((payment) => this.paymentMapper.toViewModel(payment)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
