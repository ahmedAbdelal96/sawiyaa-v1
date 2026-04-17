import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SettlementPayoutMethod,
  SettlementPayoutSource,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { SettlementRepository } from '../repositories/settlement.repository';
import { ValidateSettlementStatusTransitionService } from '../services/validate-settlement-status-transition.service';
import { RecordSettlementPayoutService } from '../services/record-settlement-payout.service';

@Injectable()
export class MarkSettlementPaidUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementRepository: SettlementRepository,
    private readonly validateSettlementStatusTransitionService: ValidateSettlementStatusTransitionService,
    private readonly recordSettlementPayoutService: RecordSettlementPayoutService,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    batchId: string;
    externalPayoutRef?: string;
    payoutMethod?: SettlementPayoutMethod;
    effectiveAt?: string;
    notes?: string;
    processedByUserId?: string | null;
  }) {
    const batch = await this.settlementRepository.getSettlementBatchDetails(
      input.batchId,
    );

    if (!batch) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.settlementBatchNotFound',
        error: 'FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_NOT_FOUND',
      });
    }

    this.validateSettlementStatusTransitionService.assertCanTransition(
      batch.status,
      'COMPLETED',
    );

    const payoutEffectiveAt = input.effectiveAt
      ? new Date(input.effectiveAt)
      : new Date();

    const updated = await this.prisma.$transaction(
      async (tx) => {
        for (const settlement of batch.settlements) {
          if (settlement.status !== 'PAID') {
            const paidSoFar = settlement.amountPaidTotal ?? new Prisma.Decimal(0);
            const remaining = settlement.amountNet.sub(paidSoFar);
            if (remaining.lte(0)) {
              continue;
            }
            await this.recordSettlementPayoutService.execute(
              {
                settlement,
                amountPaid: remaining,
                payoutMethod:
                  input.payoutMethod ?? SettlementPayoutMethod.OTHER,
                payoutSource: SettlementPayoutSource.BATCH_CLOSEOUT,
                externalPayoutRef: input.externalPayoutRef ?? null,
                notes: input.notes ?? settlement.notes ?? null,
                effectiveAt: payoutEffectiveAt,
                processedByUserId: input.processedByUserId ?? null,
              },
              tx,
            );
          }
        }

        await this.settlementRepository.updateSettlementBatchStatus(
          batch.id,
          {
            status: 'COMPLETED',
            finalizedAt: payoutEffectiveAt,
          },
          tx,
        );

        return this.settlementRepository.getSettlementBatchDetails(
          batch.id,
          tx,
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return {
      item: this.financialOperationsMapper.toSettlementBatchDetails(updated!),
    };
  }
}
