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
    const patient = input.userId
      ? await this.customerWalletPatientRepository.findByUserId(input.userId)
      : input.patientId
        ? await this.customerWalletPatientRepository.findById(input.patientId)
        : null;

    if (!patient) {
      return { item: null };
    }

    const patientId = patient.id;

    const wallet = await this.customerWalletAccountingService.getWalletSummary({
      patientId,
      currencyCode: input.currencyCode,
    });

    const ensuredWallet =
      wallet ??
      (await this.customerWalletAccountingService.ensureWallet({
        patientId,
        currencyCode:
          this.normalizeCurrencyCode(input.currencyCode) ??
          this.normalizeCurrencyCode(patient.country?.currencyCode) ??
          'EGP',
      }));

    return {
      item: {
        id: ensuredWallet.id,
        currencyCode: ensuredWallet.currencyCode,
        availableBalance: ensuredWallet.availableBalance.toString(),
        reservedBalance: ensuredWallet.reservedBalance.toString(),
        lifetimeCredited: ensuredWallet.lifetimeCredited.toString(),
        lifetimeDebited: ensuredWallet.lifetimeDebited.toString(),
        lastEntryAt: ensuredWallet.lastEntryAt?.toISOString() ?? null,
        createdAt: ensuredWallet.createdAt.toISOString(),
        updatedAt: ensuredWallet.updatedAt.toISOString(),
      },
    };
  }

  private normalizeCurrencyCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    return normalized === 'EGP' || normalized === 'USD' ? normalized : null;
  }
}
