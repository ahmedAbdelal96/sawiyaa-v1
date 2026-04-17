import { ForbiddenException } from '@nestjs/common';
import { AssessmentSubmissionAccessPolicy } from '../policies/assessment-submission-access.policy';
import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentPatientRepository } from '../repositories/assessment-patient.repository';
import { AssessmentSubmissionRepository } from '../repositories/assessment-submission.repository';
import { GetMyAssessmentSubmissionUseCase } from './get-my-assessment-submission.use-case';

describe('GetMyAssessmentSubmissionUseCase', () => {
  it('returns owned submission details with result payload', async () => {
    const patientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    } as unknown as AssessmentPatientRepository;

    const submissionRepository = {
      findPatientSubmissionById: jest.fn().mockResolvedValue({
        id: 'sub-1',
        patientProfileId: 'patient-1',
        definitionSlugSnapshot: 'anxiety-check',
        definitionTitleSnapshot: 'Anxiety Check',
        status: 'COMPLETED',
        completedAt: new Date('2026-03-01T00:00:00.000Z'),
        totalScore: 11,
        resultBand: 'MODERATE',
        resultSummary: 'summary',
        resultSnapshot: {
          summaryJson: { text: 'summary' },
          nextStepJson: { items: ['step'] },
        },
      }),
    } as unknown as AssessmentSubmissionRepository;

    const useCase = new GetMyAssessmentSubmissionUseCase(
      patientRepository,
      submissionRepository,
      new AssessmentSubmissionAccessPolicy(),
      new AssessmentPresenter(),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      submissionId: 'sub-1',
    });

    expect(result.submissionId).toBe('sub-1');
    expect(result.result?.score).toBe(11);
  });

  it('throws when requester does not own the submission', async () => {
    const patientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    } as unknown as AssessmentPatientRepository;

    const submissionRepository = {
      findPatientSubmissionById: jest.fn().mockResolvedValue({
        id: 'sub-1',
        patientProfileId: 'patient-2',
        definitionSlugSnapshot: 'anxiety-check',
        definitionTitleSnapshot: 'Anxiety Check',
        status: 'COMPLETED',
        completedAt: new Date('2026-03-01T00:00:00.000Z'),
        totalScore: 11,
        resultBand: 'MODERATE',
        resultSummary: 'summary',
        resultSnapshot: {
          summaryJson: { text: 'summary' },
          nextStepJson: { items: ['step'] },
        },
      }),
    } as unknown as AssessmentSubmissionRepository;

    const useCase = new GetMyAssessmentSubmissionUseCase(
      patientRepository,
      submissionRepository,
      new AssessmentSubmissionAccessPolicy(),
      new AssessmentPresenter(),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        submissionId: 'sub-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
