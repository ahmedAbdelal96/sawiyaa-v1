import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PatientOnboardingPolicy } from '../policies/patient-onboarding.policy';
import { PatientProfileRepository } from '../repositories/patient-profile.repository';
import { PatientUserRepository } from '../repositories/patient-user.repository';
import { CreatePatientProfileUseCase } from './create-patient-profile.use-case';

/**
 * Onboarding completion is deliberately lightweight in Phase 1.
 * We only stamp completion when the minimum personalization/profile data is already present.
 * The rule is deterministic: displayName, locale, timezone, and countryCode must all be present.
 */
@Injectable()
export class CompletePatientOnboardingUseCase {
  constructor(
    private readonly createPatientProfileUseCase: CreatePatientProfileUseCase,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly patientUserRepository: PatientUserRepository,
    private readonly patientOnboardingPolicy: PatientOnboardingPolicy,
  ) {}

  async execute(userId: string, tx?: Prisma.TransactionClient) {
    const profile = await this.createPatientProfileUseCase.execute(userId, tx);
    const user = await this.patientUserRepository.findProfileSeed(userId, tx);

    if (!user) {
      throw new BadRequestException({
        messageKey: 'patients.errors.invalidProfileState',
        error: 'PATIENT_PROFILE_INVALID_STATE',
      });
    }

    if (profile.onboardingCompletedAt) {
      return profile;
    }

    const canComplete = this.patientOnboardingPolicy.isCompletable({
      displayName: profile.displayName,
      locale: user.defaultLocale,
      timezone: user.timezone,
      countryCode: profile.country?.isoCode ?? null,
    });

    if (!canComplete) {
      throw new BadRequestException({
        messageKey: 'patients.errors.invalidProfileState',
        error: 'PATIENT_ONBOARDING_INCOMPLETE',
      });
    }

    return this.patientProfileRepository.updateByUserId(
      userId,
      {
        onboardingCompletedAt: new Date(),
      },
      tx,
    );
  }
}
