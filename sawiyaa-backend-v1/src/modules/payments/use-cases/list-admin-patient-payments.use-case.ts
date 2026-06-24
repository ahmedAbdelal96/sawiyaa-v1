import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListPatientPaymentsDto } from '../dto/list-patient-payments.dto';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class ListAdminPatientPaymentsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentMapper: PaymentMapper,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    patientId: string;
    query: ListPatientPaymentsDto;
  }) {
    // We explicitly 404 for unknown patient ids to keep admin UX predictable.
    const patientExists = await this.prisma.patientProfile.findUnique({
      where: { id: input.patientId },
      select: { id: true },
    });

    if (!patientExists) {
      throw new NotFoundException({
        messageKey: 'payments.errors.patientNotFound',
        error: 'PAYMENT_PATIENT_NOT_FOUND',
      });
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const status: PaymentStatus | undefined = input.query.status;

    const [payments, totalItems] =
      await this.paymentRepository.listPatientPayments({
        patientId: input.patientId,
        status,
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
