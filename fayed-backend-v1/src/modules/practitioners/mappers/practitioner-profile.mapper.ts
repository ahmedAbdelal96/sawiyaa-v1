import { Injectable } from '@nestjs/common';
import { PractitionerProfileViewModel } from '../types/practitioner.types';

/**
 * Profile mapper creates frontend-oriented practitioner summary output.
 * It intentionally merges profile data, user preferences, readiness, and status summaries into one clean view model.
 */
@Injectable()
export class PractitionerProfileMapper {
  toViewModel(input: {
    profile: {
      id: string;
      userId: string;
      avatarUrl: string | null;
      professionalTitle: string | null;
      bio: string | null;
      yearsOfExperience: number | null;
      practitionerType: PractitionerProfileViewModel['practitionerType'];
      practitionerGender: PractitionerProfileViewModel['practitionerGender'];
      primarySpecialtyCategoryId: string | null;
      payoutDestination: PractitionerProfileViewModel['payoutDestination'];
      status: PractitionerProfileViewModel['profileStatus'];
      createdAt: Date;
      updatedAt: Date;
      country?: { isoCode: string } | null;
    };
    user: {
      displayName: string | null;
      defaultLocale: string | null;
      timezone: string | null;
    };
    languages: string[];
    specialties: PractitionerProfileViewModel['specialties'];
    readiness: {
      isProfileCompleted: boolean;
      canSubmitApplication: boolean;
    };
    applicationStatusSummary: PractitionerProfileViewModel['applicationStatusSummary'];
    credentialSummary: PractitionerProfileViewModel['credentialSummary'];
  }): PractitionerProfileViewModel {
    return {
      practitionerProfileId: input.profile.id,
      userId: input.profile.userId,
      displayName: input.user.displayName,
      avatarUrl: input.profile.avatarUrl ?? null,
      professionalTitle: input.profile.professionalTitle,
      bio: input.profile.bio,
      countryCode: input.profile.country?.isoCode ?? null,
      locale: input.user.defaultLocale,
      timezone: input.user.timezone,
      languages: input.languages,
      yearsOfExperience: input.profile.yearsOfExperience,
      practitionerType: input.profile.practitionerType,
      practitionerGender: input.profile.practitionerGender,
      primarySpecialtyCategoryId: input.profile.primarySpecialtyCategoryId,
      payoutDestination: input.profile.payoutDestination,
      profileStatus: input.profile.status,
      specialties: input.specialties,
      isProfileCompleted: input.readiness.isProfileCompleted,
      canSubmitApplication: input.readiness.canSubmitApplication,
      applicationStatusSummary: input.applicationStatusSummary,
      credentialSummary: input.credentialSummary,
      createdAt: input.profile.createdAt,
      updatedAt: input.profile.updatedAt,
    };
  }
}
