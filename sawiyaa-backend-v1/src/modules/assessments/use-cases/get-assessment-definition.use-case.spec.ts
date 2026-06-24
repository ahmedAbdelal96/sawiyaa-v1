import { AssessmentPresenter } from '../presenters/assessment.presenter';
import { AssessmentDefinitionRepository } from '../repositories/assessment-definition.repository';
import { GetAssessmentDefinitionUseCase } from './get-assessment-definition.use-case';

describe('GetAssessmentDefinitionUseCase', () => {
  it('returns published definition with ordered questions/options', async () => {
    const definitionRepository = {
      findPublishedActiveBySlug: jest.fn().mockResolvedValue({
        slug: 'stress-check',
        title: 'Stress Check',
        description: null,
        category: 'stress',
        status: 'ACTIVE',
        introText: null,
        outroText: null,
        estimatedDurationMinutes: 3,
        questions: [
          {
            key: 'q1',
            prompt: 'Prompt',
            description: null,
            inputType: 'SINGLE_CHOICE',
            isRequired: true,
            options: [{ key: 'a', label: 'A' }],
          },
        ],
      }),
    } as unknown as AssessmentDefinitionRepository;

    const useCase = new GetAssessmentDefinitionUseCase(
      definitionRepository,
      new AssessmentPresenter(),
    );

    const result = await useCase.execute({ slug: 'stress-check' });

    expect(result.item.slug).toBe('stress-check');
    expect(result.item.questions).toHaveLength(1);
  });
});
