import { ListPublicArticlesUseCase } from '@modules/articles/use-cases/list-public-articles.use-case';
import { BuildPatientJourneyLinkedContentService } from './build-patient-journey-linked-content.service';

describe('BuildPatientJourneyLinkedContentService', () => {
  const listPublicArticlesUseCase = {
    execute: jest.fn(),
  } as unknown as ListPublicArticlesUseCase;

  const service = new BuildPatientJourneyLinkedContentService(
    listPublicArticlesUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns deterministic linked content with explainable reasons', async () => {
    (listPublicArticlesUseCase.execute as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 'article-1',
          title: 'Payment Guide',
          slug: 'payment-guide',
          excerpt: '...',
          coverImageUrl: null,
          publishedAt: '2026-03-30T10:00:00.000Z',
          category: null,
          trust: {
            freshnessBand: 'NEW',
            isFreshContent: true,
            authorDisplayName: null,
            reasonCodes: ['PUBLISHED_DATE_VERIFIED'],
          },
        },
      ],
      pagination: { page: 1, limit: 3, totalItems: 1, totalPages: 1 },
    });

    const result = await service.build({
      normalizedContext: {
        profile: {
          patientProfileId: 'patient-1',
          userId: 'user-1',
          countryCode: 'EG',
          timezone: 'Africa/Cairo',
        },
        assessments: {
          hasCompletedAssessment: true,
          latestBand: 'MILD',
          latestCompletedAt: '2026-03-30T10:00:00.000Z',
          interpretation: {
            hasAssessmentSignal: true,
            latestBand: 'MILD',
            severityScore: 2,
            careIntentLevel: 'GUIDED_MATCHING',
            actionCategory: 'COMPLETE_PAYMENT',
            reasonCodes: ['PENDING_PAYMENT_ACTION_BLOCK'],
            isActionBlockedByPayment: true,
          },
        },
        sessions: {
          hasUpcomingSession: false,
          upcomingStatus: null,
          hasPastSession: true,
        },
        payments: {
          hasPendingPayment: true,
          pendingStatus: 'PENDING',
        },
        matching: {
          hasRecentSession: false,
        },
        training: {
          hasActiveEnrollment: false,
        },
        support: {
          hasOpenTicket: false,
          latestOpenTicketStatus: null,
        },
        continuity: {
          stage: 'PAYMENT_BLOCKED',
          rulesApplied: ['PENDING_PAYMENT_HAS_PRIORITY'],
        },
      },
      suggestedNextAction: 'COMPLETE_PAYMENT',
    });

    expect(result[0]).toMatchObject({
      article: {
        id: 'article-1',
      },
      reasonCode: 'CONTENT_PAYMENT_BLOCKED',
    });
    expect(result[0].reasonText).toBeDefined();
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('does not duplicate the same article across multiple intent rules', async () => {
    (listPublicArticlesUseCase.execute as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 'article-dup',
          title: 'Continuity Guide',
          slug: 'continuity-guide',
          excerpt: null,
          coverImageUrl: null,
          publishedAt: '2026-03-20T10:00:00.000Z',
          category: null,
          trust: {
            freshnessBand: 'RECENT',
            isFreshContent: true,
            authorDisplayName: null,
            reasonCodes: ['PUBLISHED_DATE_VERIFIED'],
          },
        },
      ],
      pagination: { page: 1, limit: 3, totalItems: 1, totalPages: 1 },
    });

    const result = await service.build({
      normalizedContext: {
        profile: {
          patientProfileId: 'patient-1',
          userId: 'user-1',
          countryCode: null,
          timezone: null,
        },
        assessments: {
          hasCompletedAssessment: true,
          latestBand: 'HIGH',
          latestCompletedAt: null,
          interpretation: {
            hasAssessmentSignal: true,
            latestBand: 'HIGH',
            severityScore: 4,
            careIntentLevel: 'BOOK_PRIORITY',
            actionCategory: 'BOOK_PRIORITY_CONSULTATION',
            reasonCodes: ['ASSESSMENT_BAND_HIGH'],
            isActionBlockedByPayment: false,
          },
        },
        sessions: {
          hasUpcomingSession: false,
          upcomingStatus: null,
          hasPastSession: false,
        },
        payments: {
          hasPendingPayment: false,
          pendingStatus: null,
        },
        matching: {
          hasRecentSession: false,
        },
        training: {
          hasActiveEnrollment: true,
        },
        support: {
          hasOpenTicket: false,
          latestOpenTicketStatus: null,
        },
        continuity: {
          stage: 'ACTIVE_CARE',
          rulesApplied: [],
        },
      },
      suggestedNextAction: 'BOOK_NEXT_SESSION',
    });

    expect(
      result.filter((item) => item.article.id === 'article-dup'),
    ).toHaveLength(1);
  });
});
