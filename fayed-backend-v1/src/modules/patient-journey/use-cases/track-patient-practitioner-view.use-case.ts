import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientJourneyPatientRepository } from '../repositories/patient-journey-patient.repository';
import { PatientHomeRepository } from '../repositories/patient-home.repository';

@Injectable()
export class TrackPatientPractitionerViewUseCase {
  private readonly antiNoiseWindowMinutes = 10;

  constructor(
    private readonly patientRepository: PatientJourneyPatientRepository,
    private readonly patientHomeRepository: PatientHomeRepository,
  ) {}

  async execute(input: {
    userId: string;
    slug: string;
    locale: SupportedLocale;
  }) {
    const patient = await this.patientRepository.findByUserId(input.userId);
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'patientJourney.errors.patientProfileNotFound',
        error: 'PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const practitioner =
      await this.patientHomeRepository.findPublicPractitionerBySlug(
        input.slug,
        input.locale,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.publicPractitionerNotFound',
        error: 'PUBLIC_PRACTITIONER_NOT_FOUND',
      });
    }

    const now = new Date();
    await this.patientHomeRepository.trackView({
      patientId: patient.id,
      practitionerId: practitioner.id,
      now,
      antiNoiseWindowMinutes: this.antiNoiseWindowMinutes,
    });

    return {
      slug: practitioner.publicSlug,
      trackedAt: now.toISOString(),
    };
  }
}

