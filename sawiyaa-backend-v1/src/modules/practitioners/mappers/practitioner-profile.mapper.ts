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
      sessionPrice30Egp: { toString(): string } | string | null;
      sessionPrice30Usd: { toString(): string } | string | null;
      sessionPrice60Egp: { toString(): string } | string | null;
      sessionPrice60Usd: { toString(): string } | string | null;
      instantBookingPrice30Egp: { toString(): string } | string | null;
      instantBookingPrice30Usd: { toString(): string } | string | null;
      instantBookingPrice60Egp: { toString(): string } | string | null;
      instantBookingPrice60Usd: { toString(): string } | string | null;
      acceptsPackages?: boolean;
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
      completion: PractitionerProfileViewModel['completion'];
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
      acceptsPackage: input.profile.acceptsPackages ?? false,
      pricing: {
        session30: {
          egp:
            input.profile.sessionPrice30Egp === null ||
            input.profile.sessionPrice30Egp === undefined
              ? null
              : Number(input.profile.sessionPrice30Egp),
          usd:
            input.profile.sessionPrice30Usd === null ||
            input.profile.sessionPrice30Usd === undefined
              ? null
              : Number(input.profile.sessionPrice30Usd),
        },
        session60: {
          egp:
            input.profile.sessionPrice60Egp === null ||
            input.profile.sessionPrice60Egp === undefined
              ? null
              : Number(input.profile.sessionPrice60Egp),
          usd:
            input.profile.sessionPrice60Usd === null ||
            input.profile.sessionPrice60Usd === undefined
              ? null
              : Number(input.profile.sessionPrice60Usd),
        },
      },
      instantBookingPrice30Egp:
        input.profile.instantBookingPrice30Egp === null ||
        input.profile.instantBookingPrice30Egp === undefined
          ? null
          : Number(input.profile.instantBookingPrice30Egp),
      instantBookingPrice30Usd:
        input.profile.instantBookingPrice30Usd === null ||
        input.profile.instantBookingPrice30Usd === undefined
          ? null
          : Number(input.profile.instantBookingPrice30Usd),
      instantBookingPrice60Egp:
        input.profile.instantBookingPrice60Egp === null ||
        input.profile.instantBookingPrice60Egp === undefined
          ? null
          : Number(input.profile.instantBookingPrice60Egp),
      instantBookingPrice60Usd:
        input.profile.instantBookingPrice60Usd === null ||
        input.profile.instantBookingPrice60Usd === undefined
          ? null
          : Number(input.profile.instantBookingPrice60Usd),
      payoutDestination: input.profile.payoutDestination,
      profileStatus: input.profile.status,
      specialties: input.specialties,
      isProfileCompleted: input.readiness.isProfileCompleted,
      canSubmitApplication: input.readiness.canSubmitApplication,
      completion: input.readiness.completion,
      applicationStatusSummary: input.applicationStatusSummary,
      credentialSummary: input.credentialSummary,
      createdAt: input.profile.createdAt,
      updatedAt: input.profile.updatedAt,
    };
  }
}
