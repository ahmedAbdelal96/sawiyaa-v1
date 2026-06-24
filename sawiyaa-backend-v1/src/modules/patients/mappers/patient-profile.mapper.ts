import { Injectable } from '@nestjs/common';
import { PatientProfileViewModel } from '../types/patient-profile.types';

/**
 * Mapper keeps API responses stable and frontend-friendly.
 * It combines PatientProfile and lightweight User preference data into one clean profile response model.
 */
@Injectable()
export class PatientProfileMapper {
  toViewModel(input: {
    profile: {
      id: string;
      userId: string;
      displayName: string | null;
      dateOfBirth: Date | null;
      gender: string | null;
      onboardingCompletedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      country?: { isoCode: string } | null;
    };
    user: {
      defaultLocale: string | null;
      timezone: string | null;
    };
    avatarUrl?: string | null;
    avatarDataUrl?: string | null;
  }): PatientProfileViewModel {
    return {
      patientProfileId: input.profile.id,
      userId: input.profile.userId,
      avatarUrl: input.avatarUrl ?? null,
      avatarDataUrl: input.avatarDataUrl ?? null,
      displayName: input.profile.displayName,
      dateOfBirth: input.profile.dateOfBirth,
      gender: input.profile.gender,
      locale: input.user.defaultLocale,
      countryCode: input.profile.country?.isoCode ?? null,
      timezone: input.user.timezone,
      isOnboardingCompleted: input.profile.onboardingCompletedAt !== null,
      onboardingCompletedAt: input.profile.onboardingCompletedAt,
      createdAt: input.profile.createdAt,
      updatedAt: input.profile.updatedAt,
    };
  }
}
