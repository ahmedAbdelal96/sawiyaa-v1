import { AssessmentResultBand } from '@prisma/client';
import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentDefinitionRepository } from '../repositories/assessment-definition.repository';
import { AssessmentPatientRepository } from '../repositories/assessment-patient.repository';
import { AssessmentSubmissionRepository } from '../repositories/assessment-submission.repository';
import { BuildAssessmentNextStepService } from '../services/build-assessment-next-step.service';
import { BuildAssessmentResultSummaryService } from '../services/build-assessment-result-summary.service';
import { MapAssessmentResultBandService } from '../services/map-assessment-result-band.service';
import { ScoreAssessmentSubmissionService } from '../services/score-assessment-submission.service';
import { ValidateAssessmentSubmissionService } from '../services/validate-assessment-submission.service';
import { SubmitAssessmentUseCase } from './submit-assessment.use-case';

describe('SubmitAssessmentUseCase', () => {
  it('creates completed submission and returns result payload', async () => {
    const definitionRepository = {
      findPublishedActiveBySlug: jest.fn().mockResolvedValue({
        id: 'def-1',
        slug: 'anxiety-check',
        title: 'Anxiety Check',
        version: 1,
        scoringConfigJson: null,
        questions: [
          {
            id: 'q-1',
            key: 'q1',
            prompt: 'Prompt 1',
            options: [
              { id: 'o-1', key: 'a', label: 'A', scoreValue: 0 },
              { id: 'o-2', key: 'b', label: 'B', scoreValue: 3 },
            ],
          },
        ],
      }),
    } as unknown as AssessmentDefinitionRepository;

    const patientRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    } as unknown as AssessmentPatientRepository;

    const submissionRepository = {
      createCompleted: jest.fn().mockResolvedValue({
        id: 'sub-1',
        resultSnapshot: {
          score: 3,
          resultBand: AssessmentResultBand.HIGH,
        },
      }),
    } as unknown as AssessmentSubmissionRepository;

    const useCase = new SubmitAssessmentUseCase(
      definitionRepository,
      patientRepository,
      submissionRepository,
      new AssessmentPresenter(),
      new ValidateAssessmentSubmissionService(),
      new ScoreAssessmentSubmissionService(),
      new MapAssessmentResultBandService(),
      new BuildAssessmentResultSummaryService(),
      new BuildAssessmentNextStepService(),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      slug: 'anxiety-check',
      payload: {
        answers: [{ questionKey: 'q1', selectedOptionKey: 'b' }],
      },
    });

    expect(submissionRepository.createCompleted).toHaveBeenCalledTimes(1);
    expect(result.submissionId).toBe('sub-1');
    expect(result.result.score).toBe(3);
    expect(result.result.band).toBeDefined();
  });
});
