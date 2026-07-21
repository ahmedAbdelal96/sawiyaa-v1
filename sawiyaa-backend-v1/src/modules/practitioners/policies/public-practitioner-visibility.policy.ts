import { Injectable } from '@nestjs/common';
import { PractitionerStatus, UserStatus } from '@prisma/client';

export type PublicPractitionerVisibilityBlocker = {
  code: string;
  field?: string;
  messageKey: string;
};

/**
 * Public visibility policy for practitioner pages.
 * Public queries should include only practitioners who are approved, active, and profile-ready.
 */
@Injectable()
export class PublicPractitionerVisibilityPolicy {
  getBlockers(input: {
    practitionerStatus: PractitionerStatus;
    userStatus: UserStatus;
    isPublicProfilePublished: boolean;
    hasPublicSlug: boolean;
    hasDisplayName: boolean;
    hasProfessionalTitle: boolean;
    hasBio: boolean;
    hasAtLeastOneActiveSpecialty: boolean;
  }): PublicPractitionerVisibilityBlocker[] {
    const blockers: PublicPractitionerVisibilityBlocker[] = [];
    if (input.practitionerStatus !== PractitionerStatus.APPROVED)
      blockers.push({
        code: 'PRACTITIONER_NOT_APPROVED',
        field: 'status',
        messageKey: 'admin.practitionerPublication.blockers.notApproved',
      });
    if (input.userStatus !== UserStatus.ACTIVE)
      blockers.push({
        code: 'ACCOUNT_NOT_ACTIVE',
        field: 'accountStatus',
        messageKey: 'admin.practitionerPublication.blockers.accountInactive',
      });
    if (!input.hasPublicSlug)
      blockers.push({
        code: 'PUBLIC_SLUG_REQUIRED',
        field: 'publicSlug',
        messageKey: 'admin.practitionerPublication.blockers.publicSlug',
      });
    if (!input.hasDisplayName)
      blockers.push({
        code: 'DISPLAY_NAME_REQUIRED',
        field: 'displayName',
        messageKey: 'admin.practitionerPublication.blockers.displayName',
      });
    if (!input.hasProfessionalTitle)
      blockers.push({
        code: 'PROFESSIONAL_TITLE_REQUIRED',
        field: 'professionalTitle',
        messageKey: 'admin.practitionerPublication.blockers.professionalTitle',
      });
    if (!input.hasBio)
      blockers.push({
        code: 'BIO_REQUIRED',
        field: 'bio',
        messageKey: 'admin.practitionerPublication.blockers.bio',
      });
    if (!input.hasAtLeastOneActiveSpecialty)
      blockers.push({
        code: 'ACTIVE_SPECIALTY_REQUIRED',
        field: 'specialties',
        messageKey: 'admin.practitionerPublication.blockers.specialty',
      });
    return blockers;
  }

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
    blockers: PublicPractitionerVisibilityBlocker[];
  } {
    const blockers = this.getBlockers(input);
    const isVisible = blockers.length === 0 && input.isPublicProfilePublished;

    // In Phase 1 public pages, "verified" means visible under public publication policy.
    return {
      isVisible,
      isVerified: isVisible,
      blockers,
    };
  }
}
