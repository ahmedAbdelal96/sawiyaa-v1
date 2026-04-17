import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SettlementBatchStatus,
  SettlementPayoutSource,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { ValidateSettlementStatusTransitionService } from '../services/validate-settlement-status-transition.service';
import { RecordSettlementPayoutService } from '../services/record-settlement-payout.service';
import { RecordPractitionerSettlementPayoutDto } from '../dto/settlement-payout.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class RecordPractitionerSettlementPayoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly recordSettlementPayoutService: RecordSettlementPayoutService,
    private readonly validateSettlementStatusTransitionService: ValidateSettlementStatusTransitionService,
  ) {}

  async execute(input: {
    practitionerId: string;
    settlementId: string;
    operatorUserId: string;
    body: RecordPractitionerSettlementPayoutDto;
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

    const effectiveAt = input.body.effectiveAt
      ? new Date(input.body.effectiveAt)
      : new Date();

    const result = await this.prisma.$transaction(
      async (tx) => {
        const settlement =
          await this.settlementRepository.findPractitionerSettlementById(
            input.settlementId,
            tx,
          );

        if (!settlement) {
          throw new NotFoundException({
            messageKey: 'financialOperations.errors.settlementItemNotFound',
            error: FINANCIAL_OPS_ERROR_CODES.settlementItemNotFound,
          });
        }

        if (settlement.practitionerId !== practitioner.id) {
          throw new NotFoundException({
            messageKey: 'financialOperations.errors.resourceNotFoundInScope',
            error: FINANCIAL_OPS_ERROR_CODES.resourceNotFoundInScope,
          });
        }

        const paidSoFar = settlement.amountPaidTotal ?? new Prisma.Decimal(0);
        const remaining = settlement.amountNet.sub(paidSoFar);
        if (remaining.lte(0)) {
          throw new NotFoundException({
            messageKey: 'financialOperations.errors.settlementPayoutAlreadyRecorded',
            error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutAlreadyRecorded,
          });
        }

        const payout = await this.recordSettlementPayoutService.execute(
          {
            settlement,
            amountPaid: remaining,
            payoutMethod: input.body.payoutMethod,
            payoutSource: SettlementPayoutSource.MANUAL_EXCEPTION,
            externalPayoutRef: input.body.externalPayoutRef ?? null,
            notes: input.body.notes ?? null,
            effectiveAt,
            processedByUserId: input.operatorUserId,
          },
          tx,
        );

        const settlements =
          await this.settlementRepository.listBatchSettlements(
            settlement.batchId,
            tx,
          );
        const allPaid = settlements.every((item) => item.status === 'PAID');
        const targetStatus: SettlementBatchStatus = allPaid
          ? SettlementBatchStatus.COMPLETED
          : SettlementBatchStatus.PROCESSING;

        if (settlement.batch.status !== targetStatus) {
          this.validateSettlementStatusTransitionService.assertCanTransition(
            settlement.batch.status,
            targetStatus,
          );

          await this.settlementRepository.updateSettlementBatchStatus(
            settlement.batchId,
            {
              status: targetStatus,
              finalizedAt: allPaid ? effectiveAt : null,
            },
            tx,
          );
        }

        return payout;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return {
      item: result.payoutRecord,
    };
  }
}
