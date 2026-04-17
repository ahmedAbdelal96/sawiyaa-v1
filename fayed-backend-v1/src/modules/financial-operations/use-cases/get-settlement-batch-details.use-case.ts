import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { SettlementRepository } from '../repositories/settlement.repository';

@Injectable()
export class GetSettlementBatchDetailsUseCase {
  constructor(
    private readonly settlementRepository: SettlementRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(batchId: string) {
    const batch = await this.settlementRepository.getSettlementBatchDetails(batchId);

    if (!batch) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.settlementBatchNotFound',
        error: 'FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_NOT_FOUND',
      });
    }

    return {
      item: this.financialOperationsMapper.toSettlementBatchDetails(batch),
    };
  }
}
