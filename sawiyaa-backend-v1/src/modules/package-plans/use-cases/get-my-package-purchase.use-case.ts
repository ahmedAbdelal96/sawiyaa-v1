import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PackagePurchasePresenter } from '../presenters/package-purchase.presenter';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import { PatientPackagePurchaseResultViewModel } from '../types/package-purchases.types';
import { PractitionerProfessionalContentRepository } from '@modules/practitioners/repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { resolvePackageProfessionalTitle } from '../utils/resolve-package-professional-title.util';

@Injectable()
export class GetMyPackagePurchaseUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly packagePurchasePresenter: PackagePurchasePresenter,
    private readonly professionalContentRepository: PractitionerProfessionalContentRepository,
    private readonly professionalContentResolver: PractitionerProfessionalContentResolver,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    purchaseId: string;
  }): Promise<PatientPackagePurchaseResultViewModel> {
    const patient = await this.patientProfileRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.patientNotFound',
        error: 'PACKAGE_PURCHASE_PATIENT_NOT_FOUND',
      });
    }

    const purchase = await this.packagePurchaseRepository.findByIdForPatient({
      purchaseId: input.purchaseId,
      patientId: patient.id,
    });

    if (!purchase) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.notFound',
        error: 'PACKAGE_PURCHASE_NOT_FOUND',
      });
    }

    const now = new Date();
    const professionalContent =
      await this.professionalContentRepository.findByPractitionerProfileId(
        purchase.practitionerId,
      );

    return {
      item: await this.packagePurchasePresenter.toViewModel({
        purchase,
        now,
        resolvedProfessionalTitle: resolvePackageProfessionalTitle({
          requestedLocale: input.locale,
          resolver: this.professionalContentResolver,
          record: professionalContent,
          legacyProfessionalTitle: purchase.practitioner?.professionalTitle,
        }),
      }),
    };
  }
}
