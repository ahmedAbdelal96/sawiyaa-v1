import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutBalanceService } from '../services/practitioner-manual-payout-balance.service';
import { WalletRepository } from '../repositories/wallet.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetPractitionerWalletUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly walletRepository: WalletRepository,
    private readonly balanceService: PractitionerManualPayoutBalanceService,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { userId: string }) {
    const practitioner = await this.practitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    const wallets = await this.walletRepository.findByPractitionerId(
      practitioner.id,
    );
    const primary = wallets.find((wallet) => wallet.status === 'ACTIVE');
    if (!primary) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerWalletNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.practitionerWalletNotFound,
      });
    }
    const currencyCode = primary.currencyCode;
    const balance = await this.balanceService.getBalance({
      practitionerId: practitioner.id,
      currencyCode,
    });

    return {
      item: this.financialOperationsMapper.toWallet({
        currency: currencyCode,
        pendingBalance: primary?.pendingBalance.toString() ?? '0.00',
        availableBalance: primary?.availableBalance.toString() ?? '0.00',
        reservedBalance: primary?.reservedBalance.toString() ?? '0.00',
        totalEarned: primary?.lifetimeEarned.toString() ?? '0.00',
        lifetimePaidOut: primary?.lifetimePaidOut.toString() ?? '0.00',
        manualRecoveryAmount: balance.manualRecoveryAmount,
        lastLedgerEntryAt: primary?.lastLedgerEntryAt?.toISOString() ?? null,
        updatedAt: primary?.updatedAt?.toISOString() ?? null,
      }),
    };
  }
}
