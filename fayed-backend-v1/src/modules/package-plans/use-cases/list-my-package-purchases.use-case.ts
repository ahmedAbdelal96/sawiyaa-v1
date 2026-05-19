import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { ListMyPackagePurchasesDto } from '../dto/list-my-package-purchases.dto';
import { PackagePurchasePresenter } from '../presenters/package-purchase.presenter';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import { PatientPackagePurchasesListResultViewModel } from '../types/package-purchases.types';

@Injectable()
export class ListMyPackagePurchasesUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly packagePurchasePresenter: PackagePurchasePresenter,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    query: ListMyPackagePurchasesDto;
  }): Promise<PatientPackagePurchasesListResultViewModel> {
    const patient = await this.patientProfileRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.patientNotFound',
        error: 'PACKAGE_PURCHASE_PATIENT_NOT_FOUND',
      });
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [purchases, totalItems] =
      await this.packagePurchaseRepository.listByPatient({
        patientId: patient.id,
        skip,
        take: limit,
      });

    return {
      items: purchases.map((purchase) =>
        this.packagePurchasePresenter.toViewModel({ purchase }),
      ),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
