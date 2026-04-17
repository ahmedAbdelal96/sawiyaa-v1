import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SettlementPayoutSource } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { RecordPractitionerPayoutDto } from '../dto/practitioner-payout.dto';
import { RecordSettlementPayoutService } from '../services/record-settlement-payout.service';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class RecordPractitionerPayoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly recordSettlementPayoutService: RecordSettlementPayoutService,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    practitionerId: string;
    body: RecordPractitionerPayoutDto;
    operatorUserId: string;
  }) {
    const practitioner = await this.practitionerRepository.findById(
      input.practitionerId,
    );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    const settlement =
      await this.settlementRepository.findPractitionerDueSettlementById(
        practitioner.id,
        input.body.settlementId,
      );

    if (!settlement) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.settlementItemNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.settlementItemNotFound,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payout = await this.recordSettlementPayoutService.execute(
        {
          settlement,
          amountPaid: input.body.amountPaid,
          payoutMethod: input.body.payoutMethod,
          payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
          externalPayoutRef: input.body.externalReference ?? null,
          notes: input.body.notes ?? null,
          effectiveAt: input.body.payoutDate
            ? new Date(input.body.payoutDate)
            : new Date(),
          processedByUserId: input.operatorUserId,
        },
        tx,
      );

      const persisted =
        await this.settlementPayoutRepository.findSettlementPayoutById(
          payout.payoutRecord.id,
          tx,
        );

      if (!persisted) {
        throw new ConflictException({
          messageKey:
            'financialOperations.errors.settlementPayoutAlreadyRecorded',
          error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutAlreadyRecorded,
        });
      }

      return persisted;
    });

    return {
      item: this.financialOperationsMapper.toPractitionerPayoutDetail(result),
    };
  }
}
