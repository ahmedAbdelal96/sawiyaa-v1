import { Injectable, NotFoundException } from '@nestjs/common';
import { PackageSettlementService } from '@modules/financial-operations/services/package-settlement.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';

@Injectable()
export class ReconcilePackageSettlementUseCase {
  constructor(
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly packageSettlementService: PackageSettlementService,
  ) {}

  async execute(input: { purchaseId: string }) {
    const purchase = await this.packagePurchaseRepository.findById(
      input.purchaseId,
    );

    if (!purchase) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.notFound',
        error: 'PACKAGE_PURCHASE_NOT_FOUND',
      });
    }

    const settlement = await this.packageSettlementService.reconcilePurchase(
      purchase,
    );

    return {
      purchase,
      settlement,
    };
  }
}
