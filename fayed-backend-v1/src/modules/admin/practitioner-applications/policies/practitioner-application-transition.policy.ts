import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PractitionerApplicationStatus } from '@prisma/client';

/**
 * Transition policy keeps admin decision transitions deterministic.
 * It centralizes which application states are reviewable and which transitions are invalid.
 */
@Injectable()
export class PractitionerApplicationTransitionPolicy {
  private readonly decisionAllowedStatuses: PractitionerApplicationStatus[] = [
    PractitionerApplicationStatus.SUBMITTED,
    PractitionerApplicationStatus.UNDER_REVIEW,
  ];

  getDecisionSnapshot(status: PractitionerApplicationStatus): {
    canBeReviewed: boolean;
    canBeApproved: boolean;
    canBeRejected: boolean;
  } {
    const reviewable = this.decisionAllowedStatuses.includes(status);

    return {
      canBeReviewed: reviewable,
      canBeApproved: reviewable,
      canBeRejected: reviewable,
    };
  }

  assertCanApprove(status: PractitionerApplicationStatus): void {
    if (status === PractitionerApplicationStatus.APPROVED) {
      throw new ConflictException({
        messageKey:
          'admin.practitionerApplications.errors.applicationAlreadyApproved',
        error: 'PRACTITIONER_APPLICATION_ALREADY_APPROVED',
      });
    }

    if (status === PractitionerApplicationStatus.REJECTED) {
      throw new ConflictException({
        messageKey:
          'admin.practitionerApplications.errors.applicationAlreadyRejected',
        error: 'PRACTITIONER_APPLICATION_ALREADY_REJECTED',
      });
    }

    if (!this.decisionAllowedStatuses.includes(status)) {
      throw new BadRequestException({
        messageKey:
          'admin.practitionerApplications.errors.applicationNotReviewable',
        error: 'PRACTITIONER_APPLICATION_NOT_REVIEWABLE',
      });
    }
  }

  assertCanReject(status: PractitionerApplicationStatus): void {
    if (status === PractitionerApplicationStatus.REJECTED) {
      throw new ConflictException({
        messageKey:
          'admin.practitionerApplications.errors.applicationAlreadyRejected',
        error: 'PRACTITIONER_APPLICATION_ALREADY_REJECTED',
      });
    }

    if (status === PractitionerApplicationStatus.APPROVED) {
      throw new ConflictException({
        messageKey:
          'admin.practitionerApplications.errors.applicationAlreadyApproved',
        error: 'PRACTITIONER_APPLICATION_ALREADY_APPROVED',
      });
    }

    if (!this.decisionAllowedStatuses.includes(status)) {
      throw new BadRequestException({
        messageKey:
          'admin.practitionerApplications.errors.applicationNotReviewable',
        error: 'PRACTITIONER_APPLICATION_NOT_REVIEWABLE',
      });
    }
  }
}
