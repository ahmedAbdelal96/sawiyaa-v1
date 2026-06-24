import { Injectable } from '@nestjs/common';
import { PractitionerApplicationStatus } from '@prisma/client';
import { PractitionerApplicationTransitionPolicy } from './practitioner-application-transition.policy';

/**
 * Review policy builds a Phase-1 readiness snapshot for admin decision screens.
 * It is intentionally simple and deterministic: profile basics + specialty + credential presence.
 */
@Injectable()
export class PractitionerApplicationReviewPolicy {
  constructor(
    private readonly transitionPolicy: PractitionerApplicationTransitionPolicy,
  ) {}

  evaluateReadiness(input: {
    hasDisplayName: boolean;
    hasProfessionalTitle: boolean;
    hasBio: boolean;
    hasCountry: boolean;
    hasYearsOfExperience: boolean;
    hasLanguage: boolean;
    hasRequiredSpecialties: boolean;
    hasRequiredCredentials: boolean;
    hasPayoutDestination: boolean;
    status: PractitionerApplicationStatus;
  }): {
    isProfileCompleted: boolean;
    hasRequiredSpecialties: boolean;
    hasRequiredCredentials: boolean;
    hasPayoutDestination: boolean;
    canBeReviewed: boolean;
    canBeApproved: boolean;
    canRequestChanges: boolean;
  } {
    const profileCompleted =
      input.hasDisplayName &&
      input.hasProfessionalTitle &&
      input.hasBio &&
      input.hasCountry &&
      input.hasYearsOfExperience &&
      input.hasLanguage &&
      input.hasRequiredSpecialties &&
      input.hasRequiredCredentials &&
      input.hasPayoutDestination;

    const transitionSnapshot = this.transitionPolicy.getDecisionSnapshot(
      input.status,
    );

    return {
      isProfileCompleted: profileCompleted,
      hasRequiredSpecialties: input.hasRequiredSpecialties,
      hasRequiredCredentials: input.hasRequiredCredentials,
      hasPayoutDestination: input.hasPayoutDestination,
      canBeReviewed: transitionSnapshot.canBeReviewed,
      canBeApproved: transitionSnapshot.canBeApproved && profileCompleted,
      canRequestChanges: transitionSnapshot.canRequestChanges,
    };
  }
}
