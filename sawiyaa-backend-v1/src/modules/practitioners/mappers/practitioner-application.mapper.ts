import { Injectable } from '@nestjs/common';
import { PractitionerApplicationStatusViewModel } from '../types/practitioner.types';
import { PractitionerReviewCaseViewModel } from '../services/practitioner-review-case.service';

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
    completion: PractitionerApplicationStatusViewModel['completion'];
    reviewCase?: PractitionerReviewCaseViewModel | null;
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
      completion: input.completion,
      reviewCase: input.reviewCase
          ? {
            id: input.reviewCase.id,
            caseType: input.reviewCase.caseType,
            status: input.reviewCase.status,
            submittedAt: input.reviewCase.submittedAt,
            dueAt: input.reviewCase.dueAt,
            proposedSnapshot:
              input.reviewCase.proposedSnapshot &&
              typeof input.reviewCase.proposedSnapshot === 'object' &&
              !Array.isArray(input.reviewCase.proposedSnapshot)
                ? (input.reviewCase.proposedSnapshot as Record<string, unknown>)
                : null,
            sections: input.reviewCase.sections,
            requirements: input.reviewCase.requirements,
          }
        : null,
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
      completion: {
        overallPercent: 0,
        canSubmit: false,
        blockers: [],
        warnings: [],
        steps: [],
      },
      reviewCase: null,
    };
  }
}
