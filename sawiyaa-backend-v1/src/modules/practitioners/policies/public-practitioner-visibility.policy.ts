import { Injectable } from '@nestjs/common';
import { PractitionerStatus, UserStatus } from '@prisma/client';

/**
 * Public visibility policy for practitioner pages.
 * Public queries should include only practitioners who are approved, active, and profile-ready.
 */
@Injectable()
export class PublicPractitionerVisibilityPolicy {
  evaluate(input: {
    practitionerStatus: PractitionerStatus;
    userStatus: UserStatus;
    isPublicProfilePublished: boolean;
    hasPublicSlug: boolean;
    hasDisplayName: boolean;
    hasProfessionalTitle: boolean;
    hasBio: boolean;
    hasAtLeastOneActiveSpecialty: boolean;
  }): {
    isVisible: boolean;
    isVerified: boolean;
  } {
    const approvedAndActive =
      input.practitionerStatus === PractitionerStatus.APPROVED &&
      input.userStatus === UserStatus.ACTIVE;
    const explicitlyPublished =
      input.isPublicProfilePublished && input.hasPublicSlug;

    const profileReady =
      input.hasDisplayName &&
      input.hasProfessionalTitle &&
      input.hasBio &&
      input.hasAtLeastOneActiveSpecialty;

    const isVisible = approvedAndActive && explicitlyPublished && profileReady;

    // In Phase 1 public pages, "verified" means visible under public publication policy.
    return {
      isVisible,
      isVerified: isVisible,
    };
  }
}
