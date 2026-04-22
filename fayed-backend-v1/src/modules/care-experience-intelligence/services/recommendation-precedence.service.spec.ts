import { RecommendationPrecedenceService } from './recommendation-precedence.service';

describe('RecommendationPrecedenceService', () => {
  const service = new RecommendationPrecedenceService();

  it('orders recommendations deterministically by precedence then tie-breakers', () => {
    const input = [
      {
        type: 'TAKE_ASSESSMENT' as const,
        priority: 50,
        reasonCode: 'ASSESSMENT_MISSING',
        reasonText: 'Take an assessment first',
        action: {
          type: 'OPEN_ASSESSMENT',
          targetType: 'ASSESSMENT',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
        label: 'Take a quick self-assessment',
      },
      {
        type: 'COMPLETE_PAYMENT' as const,
        priority: 100,
        reasonCode: 'PAYMENT_PENDING',
        reasonText: 'Payment is pending',
        action: {
          type: 'OPEN_PAYMENT',
          targetType: 'PAYMENT',
          targetId: 'payment_1',
        },
        entityRefs: [{ entityType: 'PAYMENT', entityId: 'payment_1' }],
        expiresAt: null,
        label: 'Complete your pending payment',
      },
      {
        type: 'START_GUIDED_MATCHING' as const,
        priority: 60,
        reasonCode: 'MATCHING_MISSING',
        reasonText: 'Matching not started',
        action: {
          type: 'OPEN_MATCHING',
          targetType: 'MATCHING',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
        label: 'Start guided matching',
      },
    ];

    const result = service.apply(input);

    expect(result.map((item) => item.type)).toEqual([
      'COMPLETE_PAYMENT',
      'START_GUIDED_MATCHING',
      'TAKE_ASSESSMENT',
    ]);
  });

  it('returns stable ordering for repeated identical input', () => {
    const input = [
      {
        type: 'PRACTITIONER_MATCH' as const,
        priority: 64,
        reasonCode: 'MATCH_SCORE',
        reasonText: 'High compatibility',
        action: {
          type: 'OPEN_PRACTITIONER_PROFILE',
          targetType: 'PRACTITIONER',
          targetId: 'a',
        },
        entityRefs: [{ entityType: 'PRACTITIONER', entityId: 'a' }],
        expiresAt: null,
        label: null,
      },
      {
        type: 'PRACTITIONER_MATCH' as const,
        priority: 64,
        reasonCode: 'MATCH_SCORE',
        reasonText: 'High compatibility',
        action: {
          type: 'OPEN_PRACTITIONER_PROFILE',
          targetType: 'PRACTITIONER',
          targetId: 'b',
        },
        entityRefs: [{ entityType: 'PRACTITIONER', entityId: 'b' }],
        expiresAt: null,
        label: null,
      },
    ];

    const first = service.apply(input);
    const second = service.apply(input);
    expect(first).toEqual(second);
  });
});
