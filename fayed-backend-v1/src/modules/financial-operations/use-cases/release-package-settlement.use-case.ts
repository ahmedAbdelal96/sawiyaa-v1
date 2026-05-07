import { Injectable } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { PackageSettlementService } from '../services/package-settlement.service';

@Injectable()
export class ReleasePackageSettlementUseCase {
  constructor(
    private readonly packageSettlementService: PackageSettlementService,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    settlementId: string;
    releasedByAdminId: string;
  }) {
    const settlement = await this.packageSettlementService.releaseReadySettlement(
      {
        settlementId: input.settlementId,
        releasedByAdminId: input.releasedByAdminId,
      },
    );

    return {
      item: this.financialOperationsMapper.toPackageSettlement(settlement),
    };
  }
}
