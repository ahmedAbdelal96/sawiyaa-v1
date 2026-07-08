import { SessionStatus } from '@prisma/client';
import { RecommendationPrecedenceService } from '@modules/care-experience-intelligence/services/recommendation-precedence.service';
import { BuildPatientJourneyNextStepsService } from './build-patient-journey-next-steps.service';

describe('BuildPatientJourneyNextStepsService', () => {
  let service: BuildPatientJourneyNextStepsService;

  beforeEach(() => {
    service = new BuildPatientJourneyNextStepsService(
      new RecommendationPrecedenceService(),
    );
  });

  it('prioritizes pending payment first', () => {
    const result = service.build({
      hasPendingPayment: true,
      hasUpcomingSession: true,
      upcomingSessionStatus: SessionStatus.UPCOMING,
      hasOpenSupportTicket: false,
      hasRecentMatching: true,
      hasAnyAssessment: true,
      hasPastSessions: true,
      hasActiveAcademyEnrollment: false,
      continuityStage: 'PAYMENT_BLOCKED',
    });

    expect(result.suggestedNextAction).toBe('COMPLETE_PAYMENT');
    expect(result.nextSteps[0].type).toBe('COMPLETE_PAYMENT');
  });

  it('returns join upcoming session action when payment is not pending', () => {
    const result = service.build({
      hasPendingPayment: false,
      hasUpcomingSession: true,
      upcomingSessionStatus: SessionStatus.CONFIRMED,
      hasOpenSupportTicket: false,
      hasRecentMatching: true,
      hasAnyAssessment: true,
      hasPastSessions: false,
      hasActiveAcademyEnrollment: false,
      continuityStage: 'UPCOMING_SESSION',
    });

    expect(result.suggestedNextAction).toBe('JOIN_UPCOMING_SESSION');
  });

  it('suggests assessment and guided matching when patient has no journey data', () => {
    const result = service.build({
      hasPendingPayment: false,
      hasUpcomingSession: false,
      hasOpenSupportTicket: false,
      hasRecentMatching: false,
      hasAnyAssessment: false,
      hasPastSessions: false,
      hasActiveAcademyEnrollment: false,
      continuityStage: 'NEW',
    });

    expect(result.nextSteps.map((item) => item.type)).toEqual([
      'START_GUIDED_MATCHING',
      'TAKE_ASSESSMENT',
    ]);
    expect(result.suggestedNextAction).toBe('START_GUIDED_MATCHING');
    expect(result.nextSteps[0].reasonCode).toBeDefined();
    expect(result.nextSteps[0].reasonText).toBeDefined();
    expect(result.nextSteps[0].action).toBeDefined();
  });

  it('suggests viewing support ticket when there is an open support case', () => {
    const result = service.build({
      hasPendingPayment: false,
      hasUpcomingSession: false,
      hasOpenSupportTicket: true,
      hasRecentMatching: true,
      hasAnyAssessment: true,
      hasPastSessions: true,
      hasActiveAcademyEnrollment: false,
      continuityStage: 'RETURNING',
    });

    expect(result.nextSteps[0].type).toBe('VIEW_SUPPORT_TICKET');
    expect(result.nextSteps[0].priority).toBe(80);
  });

  it('accepts assessment-derived recommendations through shared contract mapping', () => {
    const result = service.build({
      hasPendingPayment: false,
      hasUpcomingSession: false,
      hasOpenSupportTicket: false,
      hasRecentMatching: true,
      hasAnyAssessment: true,
      hasPastSessions: false,
      hasActiveAcademyEnrollment: false,
      continuityStage: 'RETURNING',
      assessmentRecommendations: [
        {
          type: 'BOOK_NEXT_SESSION',
          priority: 75,
          reasonCode: 'ASSESSMENT_BAND_HIGH',
          reasonText: 'Prioritized consultation is recommended.',
          action: {
            type: 'OPEN_BOOKING',
            targetType: 'SESSION',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Book priority consultation',
        },
      ],
    });

    expect(result.nextSteps[0].type).toBe('BOOK_NEXT_SESSION');
    expect(result.nextSteps[0].reasonCode).toBe('ASSESSMENT_BAND_HIGH');
  });

  it('handles active academy continuity explicitly', () => {
    const result = service.build({
      hasPendingPayment: false,
      hasUpcomingSession: false,
      hasOpenSupportTicket: false,
      hasRecentMatching: false,
      hasAnyAssessment: true,
      hasPastSessions: false,
      hasActiveAcademyEnrollment: true,
      continuityStage: 'ACTIVE_CARE',
    });

    expect(result.suggestedNextAction).toBe('BOOK_NEXT_SESSION');
    expect(result.nextSteps[0].reasonCode).toBe('ACTIVE_CARE_CONTINUITY');
    expect(result.nextSteps[0].action.type).toBe('OPEN_ACADEMY');
  });

  it('removes contradictory actions when payment-block recommendation exists', () => {
    const result = service.build({
      hasPendingPayment: true,
      hasUpcomingSession: false,
      hasOpenSupportTicket: false,
      hasRecentMatching: false,
      hasAnyAssessment: false,
      hasPastSessions: false,
      hasActiveAcademyEnrollment: false,
      continuityStage: 'PAYMENT_BLOCKED',
      assessmentRecommendations: [
        {
          type: 'BOOK_NEXT_SESSION',
          priority: 75,
          reasonCode: 'ASSESSMENT_BAND_HIGH',
          reasonText: 'Prioritized consultation is recommended.',
          action: {
            type: 'OPEN_BOOKING',
            targetType: 'SESSION',
            targetId: null,
          },
          entityRefs: [],
          expiresAt: null,
          label: 'Book priority consultation',
        },
      ],
    });

    expect(result.nextSteps.map((item) => item.type)).toEqual([
      'COMPLETE_PAYMENT',
    ]);
  });
});
