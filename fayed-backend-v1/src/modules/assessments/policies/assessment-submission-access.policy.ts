import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AssessmentSubmissionAccessPolicy {
  assertOwner(input: {
    submissionPatientProfileId: string;
    requesterPatientProfileId: string;
  }) {
    if (input.submissionPatientProfileId !== input.requesterPatientProfileId) {
      throw new ForbiddenException({
        messageKey: 'assessments.errors.assessmentSubmissionForbidden',
        error: 'ASSESSMENT_SUBMISSION_FORBIDDEN',
      });
    }
  }
}
