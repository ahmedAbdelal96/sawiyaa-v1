import { Injectable } from '@nestjs/common';
import { CustomerWalletPatientRepository } from '../repositories/customer-wallet-patient.repository';
import { CustomerWalletAccountingService } from '../services/customer-wallet-accounting.service';

@Injectable()
export class GetCustomerWalletSummaryUseCase {
  constructor(
    private readonly customerWalletPatientRepository: CustomerWalletPatientRepository,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
  ) {}

  async execute(input: {
    userId?: string;
    patientId?: string;
    currencyCode?: string;
  }) {
    let patientId = input.patientId;

    if (!patientId && input.userId) {
      const patient = await this.customerWalletPatientRepository.findByUserId(
        input.userId,
      );
      if (!patient) {
        return { item: null };
      }
      patientId = patient.id;
    }

    if (!patientId) {
      return { item: null };
    }

    const wallet = await this.customerWalletAccountingService.getWalletSummary({
      patientId,
      currencyCode: input.currencyCode,
    });

    if (!wallet) {
      return { item: null };
    }

    return {
      item: {
        id: wallet.id,
        currencyCode: wallet.currencyCode,
        availableBalance: wallet.availableBalance.toString(),
        reservedBalance: wallet.reservedBalance.toString(),
        lifetimeCredited: wallet.lifetimeCredited.toString(),
        lifetimeDebited: wallet.lifetimeDebited.toString(),
        lastEntryAt: wallet.lastEntryAt?.toISOString() ?? null,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      },
    };
  }
}
