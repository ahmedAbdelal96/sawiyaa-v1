import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentSubmissionAccessPolicy } from '../policies/assessment-submission-access.policy';
import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentPatientRepository } from '../repositories/assessment-patient.repository';
import { AssessmentSubmissionRepository } from '../repositories/assessment-submission.repository';

@Injectable()
export class GetMyAssessmentSubmissionUseCase {
  constructor(
    private readonly assessmentPatientRepository: AssessmentPatientRepository,
    private readonly assessmentSubmissionRepository: AssessmentSubmissionRepository,
    private readonly assessmentSubmissionAccessPolicy: AssessmentSubmissionAccessPolicy,
    private readonly assessmentPresenter: AssessmentPresenter,
  ) {}

  async execute(input: { userId: string; submissionId: string }) {
    const patientProfile = await this.assessmentPatientRepository.findByUserId(
      input.userId,
    );
    if (!patientProfile) {
      throw new NotFoundException({
        messageKey: 'assessments.errors.patientProfileNotFound',
        error: 'ASSESSMENT_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const submission =
      await this.assessmentSubmissionRepository.findPatientSubmissionById({
        patientProfileId: patientProfile.id,
        submissionId: input.submissionId,
      });
    if (!submission) {
      throw new NotFoundException({
        messageKey: 'assessments.errors.submissionNotFound',
        error: 'ASSESSMENT_SUBMISSION_NOT_FOUND',
      });
    }

    this.assessmentSubmissionAccessPolicy.assertOwner({
      submissionPatientProfileId: submission.patientProfileId,
      requesterPatientProfileId: patientProfile.id,
    });

    const summaryJson = submission.resultSnapshot?.summaryJson;
    const summaryText =
      summaryJson &&
      typeof summaryJson === 'object' &&
      !Array.isArray(summaryJson)
        ? String(
            (summaryJson as { text?: string }).text ??
              submission.resultSummary ??
              '',
          )
        : (submission.resultSummary ?? '');

    const nextStepJson = submission.resultSnapshot?.nextStepJson;
    const nextSteps =
      nextStepJson &&
      typeof nextStepJson === 'object' &&
      !Array.isArray(nextStepJson) &&
      Array.isArray((nextStepJson as { items?: unknown[] }).items)
        ? (nextStepJson as { items: unknown[] }).items
            .map((item) => (typeof item === 'string' ? item : null))
            .filter((item): item is string => Boolean(item))
        : [];

    if (
      submission.totalScore == null ||
      submission.resultBand == null ||
      !submission.resultSnapshot
    ) {
      throw new ForbiddenException({
        messageKey: 'assessments.errors.incompleteSubmissionNotSupported',
        error: 'ASSESSMENT_INCOMPLETE_SUBMISSION_NOT_SUPPORTED',
      });
    }

    return this.assessmentPresenter.presentPatientSubmissionDetails({
      submissionId: submission.id,
      assessmentSlug: submission.definitionSlugSnapshot,
      assessmentTitle: submission.definitionTitleSnapshot,
      status: submission.status,
      completedAt: submission.completedAt,
      result: {
        score: submission.totalScore,
        band: submission.resultBand,
        summary: summaryText,
        nextSteps,
      },
    });
  }
}
