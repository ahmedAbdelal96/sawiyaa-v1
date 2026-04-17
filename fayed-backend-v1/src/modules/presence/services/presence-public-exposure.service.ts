import { Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerPresence, PractitionerStatus, UserStatus } from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';

type PublicPractitionerSeed = {
  status: PractitionerStatus;
  isPublicProfilePublished: boolean;
  publicSlug: string;
  professionalTitle: string | null;
  bio: string | null;
  user: {
    status: UserStatus;
    displayName: string | null;
    id: string;
  };
  specialties: Array<{
    specialtyId: string;
  }>;
};

/**
 * Public presence exposure reuses the same visibility baseline as public practitioner pages.
 * Hidden or non-public practitioners must never leak live-state metadata.
 */
@Injectable()
export class PresencePublicExposureService {
  constructor(
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
  ) {}

  assertVisible(practitioner: PublicPractitionerSeed): void {
    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: practitioner.status,
      userStatus: practitioner.user.status,
      isPublicProfilePublished: practitioner.isPublicProfilePublished,
      hasPublicSlug: Boolean(practitioner.publicSlug?.trim()),
      hasDisplayName: Boolean(practitioner.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(practitioner.professionalTitle?.trim()),
      hasBio: Boolean(practitioner.bio?.trim()),
      hasAtLeastOneActiveSpecialty: practitioner.specialties.length > 0,
    });

    if (!visibility.isVisible) {
      throw new NotFoundException({
        messageKey: 'presence.errors.publicPresenceNotFound',
        error: 'PUBLIC_PRESENCE_NOT_VISIBLE',
      });
    }
  }

  sanitizeForPublic(
    presence: PractitionerPresence | null,
  ): PractitionerPresence | null {
    return presence;
  }
}
