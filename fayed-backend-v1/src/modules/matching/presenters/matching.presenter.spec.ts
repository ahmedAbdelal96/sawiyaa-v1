import { RecommendationPrecedenceService } from '@modules/care-experience-intelligence/services/recommendation-precedence.service';
import { MatchingAnswerKey } from '@prisma/client';
import { MatchingPresenter } from './matching.presenter';

describe('MatchingPresenter', () => {
  const presenter = new MatchingPresenter(new RecommendationPrecedenceService());

  it('emits shared recommendation contract with explainability fields', () => {
    const result = presenter.presentSession({
      sessionId: 'm1',
      answers: [
        {
          key: MatchingAnswerKey.PRIMARY_CONCERN,
          valueJson: 'anxiety',
        },
      ],
      recommendations: [
        {
          score: 88,
          rank: 1,
          rationaleJson: { notes: ['Matched preferred specialty'] },
          practitionerProfile: {
            id: 'p1',
            publicSlug: 'dr-a',
            professionalTitle: 'Therapist',
            sessionPrice30: 500,
            sessionPrice60: 900,
            user: { displayName: 'Dr A' },
            languages: [{ language: { code: 'en' } }],
            specialties: [
              {
                specialty: { translations: [{ title: 'Anxiety' }] },
              },
            ],
          },
        },
      ],
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toEqual(
      expect.objectContaining({
        type: 'PRACTITIONER_MATCH',
        priority: expect.any(Number),
        reasonCode: 'MATCH_SCORE',
        reasonText: expect.any(String),
        action: expect.objectContaining({
          type: 'OPEN_PRACTITIONER_PROFILE',
          targetType: 'PRACTITIONER',
        }),
        entityRefs: expect.any(Array),
        expiresAt: null,
      }),
    );
  });

  it('keeps deterministic ordering when assessment-derived recommendations are included', () => {
    const result = presenter.presentSession({
      sessionId: 'm1',
      answers: [],
      recommendations: [
        {
          score: 80,
          rank: 1,
          rationaleJson: { notes: ['Matched preferred specialty'] },
          practitionerProfile: {
            id: 'p1',
            publicSlug: 'dr-a',
            professionalTitle: 'Therapist',
            sessionPrice30: 500,
            sessionPrice60: 900,
            user: { displayName: 'Dr A' },
            languages: [{ language: { code: 'en' } }],
            specialties: [
              {
                specialty: { translations: [{ title: 'Anxiety' }] },
              },
            ],
          },
        },
      ],
      assessmentRecommendations: [
        {
          type: 'COMPLETE_PAYMENT',
          priority: 100,
          reasonCode: 'PENDING_PAYMENT_ACTION_BLOCK',
          reasonText: 'Complete payment before progressing.',
          action: {
            type: 'OPEN_PENDING_PAYMENT',
            targetType: 'PAYMENT',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Complete pending payment',
        },
      ],
    });

    expect(result.recommendations[0].type).toBe('COMPLETE_PAYMENT');
    expect(result.recommendations[1].type).toBe('PRACTITIONER_MATCH');
  });
});
