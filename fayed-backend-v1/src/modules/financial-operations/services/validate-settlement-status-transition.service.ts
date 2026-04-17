import { BadRequestException, Injectable } from '@nestjs/common';
import { SettlementBatchStatus } from '@prisma/client';

@Injectable()
export class ValidateSettlementStatusTransitionService {
  private readonly allowedTransitions: Record<
    SettlementBatchStatus,
    SettlementBatchStatus[]
  > = {
    DRAFT: ['GENERATED', 'CANCELLED'],
    GENERATED: ['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    FINALIZED: ['PROCESSING', 'COMPLETED', 'FAILED'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    COMPLETED: [],
    FAILED: [],
    CANCELLED: [],
  };

  assertCanTransition(from: SettlementBatchStatus, to: SettlementBatchStatus) {
    if (from === to) {
      return;
    }

    if (!this.allowedTransitions[from].includes(to)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidSettlementState',
        error: 'FINANCIAL_OPERATIONS_INVALID_SETTLEMENT_STATE',
      });
    }
  }
}
