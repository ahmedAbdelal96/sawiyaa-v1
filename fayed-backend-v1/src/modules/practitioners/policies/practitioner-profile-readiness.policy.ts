import { Injectable } from '@nestjs/common';
import { PractitionerReadinessViewModel } from '../types/practitioner.types';

/**
 * Readiness policy defines deterministic baseline completion requirements.
 * This central policy prevents readiness logic from leaking into controllers/repositories.
 */
@Injectable()
export class PractitionerProfileReadinessPolicy {
  evaluate(input: {
    displayName: string | null;
    professionalTitle: string | null;
    bio: string | null;
    countryCode: string | null;
    yearsOfExperience: number | null;
    languageCount: number;
    specialtyCount: number;
    primarySpecialtyCategoryId: string | null;
    credentialCount: number;
    hasPayoutDestination: boolean;
    hasPayoutAccountHolderName: boolean;
    isAccountActive: boolean;
    isPractitionerOtpVerified: boolean;
  }): PractitionerReadinessViewModel {
    const checks = {
      hasDisplayName: Boolean(input.displayName?.trim()),
      hasProfessionalTitle: Boolean(input.professionalTitle?.trim()),
      hasBio: Boolean(input.bio?.trim()),
      hasCountry: Boolean(input.countryCode?.trim()),
      hasYearsOfExperience:
        input.yearsOfExperience !== null && input.yearsOfExperience >= 0,
      hasLanguage: input.languageCount > 0,
      hasSpecialty: input.specialtyCount > 0,
      hasPrimarySpecialty: Boolean(input.primarySpecialtyCategoryId?.trim()),
      hasCredential: input.credentialCount > 0,
      hasPayoutDestination: input.hasPayoutDestination,
      hasPayoutAccountHolderName: input.hasPayoutAccountHolderName,
      isAccountActive: input.isAccountActive,
      isPractitionerOtpVerified: input.isPractitionerOtpVerified,
    };

    const missingRequirements: string[] = [];

    if (!checks.hasDisplayName) {
      missingRequirements.push('displayName');
    }
    if (!checks.hasProfessionalTitle) {
      missingRequirements.push('professionalTitle');
    }
    if (!checks.hasBio) {
      missingRequirements.push('bio');
    }
    if (!checks.hasCountry) {
      missingRequirements.push('countryCode');
    }
    if (!checks.hasYearsOfExperience) {
      missingRequirements.push('yearsOfExperience');
    }
    if (!checks.hasLanguage) {
      missingRequirements.push('languages');
    }
    if (!checks.hasSpecialty) {
      missingRequirements.push('specialties');
    }
    if (!checks.hasPrimarySpecialty) {
      missingRequirements.push('primarySpecialtyCategoryId');
    }
    if (!checks.hasCredential) {
      missingRequirements.push('credentials');
    }
    if (!checks.hasPayoutDestination) {
      missingRequirements.push('payoutDestination');
    }
    if (!checks.hasPayoutAccountHolderName) {
      missingRequirements.push('payoutAccountHolderName');
    }
    if (!checks.isAccountActive) {
      missingRequirements.push('activeAccount');
    }
    if (!checks.isPractitionerOtpVerified) {
      missingRequirements.push('practitionerOtpVerified');
    }

    const isProfileCompleted =
      checks.hasDisplayName &&
      checks.hasProfessionalTitle &&
      checks.hasBio &&
      checks.hasCountry &&
      checks.hasYearsOfExperience &&
      checks.hasLanguage &&
      checks.hasSpecialty &&
      checks.hasPrimarySpecialty &&
      checks.hasCredential &&
      checks.hasPayoutDestination &&
      checks.hasPayoutAccountHolderName;

    return {
      isProfileCompleted,
      canSubmitApplication:
        isProfileCompleted &&
        checks.isAccountActive &&
        checks.isPractitionerOtpVerified,
      missingRequirements,
      checks,
    };
  }
}
