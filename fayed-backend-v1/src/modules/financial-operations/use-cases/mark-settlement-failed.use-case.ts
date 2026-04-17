import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { RefreshPractitionerWalletService } from '../services/refresh-practitioner-wallet.service';
import { ValidateSettlementStatusTransitionService } from '../services/validate-settlement-status-transition.service';

@Injectable()
export class MarkSettlementFailedUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementRepository: SettlementRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
    private readonly validateSettlementStatusTransitionService: ValidateSettlementStatusTransitionService,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { batchId: string; notes?: string }) {
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
      'FAILED',
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const settlement of batch.settlements) {
        if (settlement.status !== 'PAID') {
          await this.settlementRepository.updatePractitionerSettlement(
            settlement.id,
            {
              status: 'FAILED',
              failedAt: new Date(),
              notes: input.notes ?? settlement.notes ?? null,
            },
            tx,
          );

          await this.ledgerRepository.releaseSettlementEntries(
            settlement.id,
            tx,
          );
          await this.refreshPractitionerWalletService.refresh(
            settlement.practitionerId,
            tx,
          );
        }
      }

      await this.settlementRepository.updateSettlementBatchStatus(
        batch.id,
        {
          status: 'FAILED',
        },
        tx,
      );

      return this.settlementRepository.getSettlementBatchDetails(batch.id, tx);
    });

    return {
      item: this.financialOperationsMapper.toSettlementBatchDetails(updated!),
    };
  }
}
