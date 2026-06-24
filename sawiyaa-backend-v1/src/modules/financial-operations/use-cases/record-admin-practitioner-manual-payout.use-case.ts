import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutService } from '../services/practitioner-manual-payout.service';
import { RecordAdminPractitionerManualPayoutDto } from '../dto/admin-practitioner-payouts.dto';

@Injectable()
export class RecordAdminPractitionerManualPayoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly payoutService: PractitionerManualPayoutService,
    private readonly mapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    body: RecordAdminPractitionerManualPayoutDto;
    operatorUserId: string;
  }) {
    const practitioner = await this.practitionerRepository.findById(
      input.body.practitionerId,
    );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    const result = await this.prisma.$transaction(async (tx) =>
      this.payoutService.record({
        practitionerId: practitioner.id,
        currencyCode: input.body.currencyCode,
        amountPaid: input.body.amountPaid,
        paidAt: input.body.paidAt ? new Date(input.body.paidAt) : undefined,
        paymentMethod: input.body.paymentMethod,
        transferReference: input.body.transferReference ?? null,
        notes: input.body.notes ?? null,
        recordedByUserId: input.operatorUserId,
        tx,
      }),
    );

    return {
      item: this.mapper.toPractitionerManualPayout(result.payoutRecord),
    };
  }
}
