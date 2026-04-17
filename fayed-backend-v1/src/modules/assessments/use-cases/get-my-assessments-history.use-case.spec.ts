import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentPatientRepository } from '../repositories/assessment-patient.repository';
import { AssessmentSubmissionRepository } from '../repositories/assessment-submission.repository';
import { GetMyAssessmentsHistoryUseCase } from './get-my-assessments-history.use-case';

describe('GetMyAssessmentsHistoryUseCase', () => {
  it('returns paginated patient-owned submission history', async () => {
    const patientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    } as unknown as AssessmentPatientRepository;

    const submissionRepository = {
      listPatientSubmissions: jest.fn().mockResolvedValue([
        [
          {
            id: 'sub-1',
            definitionSlugSnapshot: 'stress-check',
            definitionTitleSnapshot: 'Stress Check',
            status: 'COMPLETED',
            totalScore: 4,
            resultBand: 'MILD',
            completedAt: new Date('2026-03-01T00:00:00.000Z'),
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
          },
        ],
        1,
      ]),
    } as unknown as AssessmentSubmissionRepository;

    const useCase = new GetMyAssessmentsHistoryUseCase(
      patientRepository,
      submissionRepository,
      new AssessmentPresenter(),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      query: {
        page: 1,
        limit: 20,
      },
    });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
  });
});
