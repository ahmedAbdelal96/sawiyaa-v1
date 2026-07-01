import { Injectable } from '@nestjs/common';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';

@Injectable()
export class PublicPractitionerPricingContextService {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
  ) {}

  async resolve(input: {
    currentUserId?: string | null;
    guestCountryIsoCode?: string | null;
  }) {
    const patientProfile = input.currentUserId
      ? await this.patientProfileRepository.findByUserId(input.currentUserId)
      : null;

    return resolvePaymentRegionalResolution({
      patientCountryIsoCode: patientProfile?.country?.isoCode ?? null,
      checkoutCountryIsoCode: input.guestCountryIsoCode ?? null,
    });
  }
}
