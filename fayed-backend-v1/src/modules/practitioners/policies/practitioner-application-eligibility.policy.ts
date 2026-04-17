import { Injectable } from '@nestjs/common';
import { PractitionerApplicationStatus } from '@prisma/client';
import { PractitionerReadinessViewModel } from '../types/practitioner.types';

/**
 * Application eligibility policy combines readiness with current application state.
 * This keeps submit decisions deterministic and centrally explainable.
 */
@Injectable()
export class PractitionerApplicationEligibilityPolicy {
  evaluate(input: {
    readiness: PractitionerReadinessViewModel;
    latestApplicationStatus: PractitionerApplicationStatus | null;
  }): {
    canSubmit: boolean;
    reason:
      | 'READINESS_NOT_MET'
      | 'APPLICATION_ALREADY_SUBMITTED'
      | 'APPLICATION_ALREADY_APPROVED'
      | null;
  } {
    if (!input.readiness.canSubmitApplication) {
      return {
        canSubmit: false,
        reason: 'READINESS_NOT_MET',
      };
    }

    if (
      input.latestApplicationStatus === PractitionerApplicationStatus.SUBMITTED ||
      input.latestApplicationStatus ===
        PractitionerApplicationStatus.UNDER_REVIEW
    ) {
      return {
        canSubmit: false,
        reason: 'APPLICATION_ALREADY_SUBMITTED',
      };
    }

    if (
      input.latestApplicationStatus === PractitionerApplicationStatus.APPROVED
    ) {
      return {
        canSubmit: false,
        reason: 'APPLICATION_ALREADY_APPROVED',
      };
    }

    return {
      canSubmit: true,
      reason: null,
    };
  }
}

