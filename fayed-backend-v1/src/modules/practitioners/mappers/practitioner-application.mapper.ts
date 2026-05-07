import { Injectable } from '@nestjs/common';
import { PractitionerApplicationStatusViewModel } from '../types/practitioner.types';

/**
 * Application mapper keeps response output stable whether an application exists or not.
 */
@Injectable()
export class PractitionerApplicationMapper {
  toViewModel(input: {
    id: string;
    status: PractitionerApplicationStatusViewModel['status'];
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewedByUserId: string | null;
    reviewDecisionReason: string | null;
    reviewNotes: string | null;
    submissionSnapshot: Record<string, unknown> | null;
  }): PractitionerApplicationStatusViewModel {
    return {
      applicationId: input.id,
      status: input.status,
      submittedAt: input.submittedAt,
      reviewedAt: input.reviewedAt,
      reviewedByUserId: input.reviewedByUserId,
      reviewDecisionReason: input.reviewDecisionReason,
      reviewNotes: input.reviewNotes,
      submissionSnapshot: input.submissionSnapshot,
    };
  }

  empty(): PractitionerApplicationStatusViewModel {
    return {
      applicationId: null,
      status: null,
      submittedAt: null,
      reviewedAt: null,
      reviewedByUserId: null,
      reviewDecisionReason: null,
      reviewNotes: null,
      submissionSnapshot: null,
    };
  }
}
