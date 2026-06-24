import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { PackageSettlementRepository } from '../repositories/package-settlement.repository';

@Injectable()
export class GetAdminPackageSettlementUseCase {
  constructor(
    private readonly packageSettlementRepository: PackageSettlementRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(id: string) {
    const settlement = await this.packageSettlementRepository.findById(id);

    if (!settlement) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.packageSettlementNotFound',
        error: 'FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_NOT_FOUND',
      });
    }

    return {
      item: this.financialOperationsMapper.toPackageSettlement(settlement),
    };
  }
}
