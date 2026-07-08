import { Injectable } from '@nestjs/common';
import { CareContinuityStage } from '@modules/care-experience-intelligence/types/care-signal-context.types';
import { CareRecommendationItem } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { SessionStatus } from '@prisma/client';
import { RecommendationPrecedenceService } from '@modules/care-experience-intelligence/services/recommendation-precedence.service';
import {
  PatientJourneyNextStepType,
  PatientJourneyNextStepViewModel,
} from '../types/patient-journey.types';

@Injectable()
export class BuildPatientJourneyNextStepsService {
  constructor(
    private readonly recommendationPrecedenceService: RecommendationPrecedenceService,
  ) {}

  build(input: {
    hasPendingPayment: boolean;
    hasUpcomingSession: boolean;
    upcomingSessionStatus?: SessionStatus;
    hasOpenSupportTicket: boolean;
    hasRecentMatching: boolean;
    hasAnyAssessment: boolean;
    hasPastSessions: boolean;
    hasActiveAcademyEnrollment: boolean;
    continuityStage: CareContinuityStage;
    assessmentRecommendations?: CareRecommendationItem[];
  }): {
    suggestedNextAction: PatientJourneyNextStepType;
    nextSteps: PatientJourneyNextStepViewModel[];
  } {
    const nextSteps: PatientJourneyNextStepViewModel[] = [];
    const isPaymentBlocked =
      input.hasPendingPayment || input.continuityStage === 'PAYMENT_BLOCKED';
    const isUpcomingContinuity =
      input.hasUpcomingSession || input.continuityStage === 'UPCOMING_SESSION';
    const isActiveCare =
      input.hasActiveAcademyEnrollment ||
      input.continuityStage === 'ACTIVE_CARE';
    const isReturning =
      input.hasPastSessions || input.continuityStage === 'RETURNING';

    if (isPaymentBlocked) {
      nextSteps.push({
        type: 'COMPLETE_PAYMENT',
        label: 'Complete your pending payment',
        priority: 100,
        reasonCode: 'PAYMENT_PENDING',
        reasonText: 'You have a pending payment that blocks progress.',
        action: {
          type: 'OPEN_PENDING_PAYMENT',
          targetType: 'PAYMENT',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
      });
    }

    const joinEligibleStatuses: SessionStatus[] = [
      SessionStatus.CONFIRMED,
      SessionStatus.UPCOMING,
      SessionStatus.READY_TO_JOIN,
    ];

    if (
      isUpcomingContinuity &&
      input.upcomingSessionStatus &&
      joinEligibleStatuses.includes(input.upcomingSessionStatus)
    ) {
      nextSteps.push({
        type: 'JOIN_UPCOMING_SESSION',
        label: 'Join your upcoming session',
        priority: 90,
        reasonCode: 'UPCOMING_SESSION_JOINABLE',
        reasonText:
          'Your upcoming session is joinable based on current status.',
        action: {
          type: 'OPEN_UPCOMING_SESSION',
          targetType: 'SESSION',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
      });
    }

    if (input.hasOpenSupportTicket) {
      nextSteps.push({
        type: 'VIEW_SUPPORT_TICKET',
        label: 'View your open support ticket',
        priority: 80,
        reasonCode: 'SUPPORT_TICKET_OPEN',
        reasonText:
          'You already have an open support ticket that needs follow-up.',
        action: {
          type: 'OPEN_SUPPORT_TICKET',
          targetType: 'SUPPORT_TICKET',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
      });
    }

    if (!input.hasAnyAssessment && !isUpcomingContinuity && !isPaymentBlocked) {
      nextSteps.push({
        type: 'TAKE_ASSESSMENT',
        label: 'Take a quick self-assessment',
        priority: 50,
        reasonCode: 'ASSESSMENT_MISSING',
        reasonText:
          'Assessment results help produce more accurate recommendations.',
        action: {
          type: 'OPEN_ASSESSMENTS',
          targetType: 'ASSESSMENT',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
      });
    }

    if (
      !input.hasRecentMatching &&
      !isUpcomingContinuity &&
      !isActiveCare &&
      !isPaymentBlocked
    ) {
      nextSteps.push({
        type: 'START_GUIDED_MATCHING',
        label: 'Start guided matching to find a suitable practitioner',
        priority: 60,
        reasonCode: 'MATCHING_NOT_STARTED',
        reasonText: 'Guided matching helps shortlist suitable practitioners.',
        action: {
          type: 'OPEN_MATCHING',
          targetType: 'MATCHING_SESSION',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
      });
    }

    if (
      !isUpcomingContinuity &&
      (isReturning || isActiveCare || input.hasRecentMatching)
    ) {
      nextSteps.push({
        type: 'BOOK_NEXT_SESSION',
        label: isActiveCare
          ? 'Continue your active care plan'
          : 'Book your next session',
        priority: isActiveCare ? 72 : 70,
        reasonCode: isActiveCare
          ? 'ACTIVE_CARE_CONTINUITY'
          : 'CONTINUITY_RECOMMENDED',
        reasonText: isActiveCare
          ? 'You have an active care/academy track; continue continuity with a next session action.'
          : 'Continuity is recommended based on your existing journey history.',
        action: {
          type: isActiveCare ? 'OPEN_ACADEMY' : 'OPEN_BOOKING',
          targetType: isActiveCare ? 'ACADEMY' : 'SESSION',
          targetId: null,
        },
        entityRefs: [],
        expiresAt: null,
      });
    }

    for (const recommendation of input.assessmentRecommendations ?? []) {
      const mapped =
        this.mapAssessmentRecommendationToJourneyStep(recommendation);
      if (mapped) {
        nextSteps.push(mapped);
      }
    }

    const prioritized = this.recommendationPrecedenceService.apply(nextSteps);
    const deduplicated = this.deduplicate(prioritized);
    const conflictResolved = this.resolveConflicts(deduplicated);
    const suggestedNextAction =
      conflictResolved[0]?.type ?? 'START_GUIDED_MATCHING';

    if (conflictResolved.length === 0) {
      return {
        suggestedNextAction,
        nextSteps: [
          {
            type: 'START_GUIDED_MATCHING',
            label: 'Start guided matching to begin your journey',
            priority: 60,
            reasonCode: 'JOURNEY_EMPTY',
            reasonText: 'No active journey signals found yet.',
            action: {
              type: 'OPEN_MATCHING',
              targetType: 'MATCHING_SESSION',
              targetId: null,
            },
            entityRefs: [],
            expiresAt: null,
          },
        ],
      };
    }

    return {
      suggestedNextAction,
      nextSteps: conflictResolved,
    };
  }

  private mapAssessmentRecommendationToJourneyStep(
    recommendation: CareRecommendationItem,
  ): PatientJourneyNextStepViewModel | null {
    switch (recommendation.type) {
      case 'COMPLETE_PAYMENT':
      case 'JOIN_UPCOMING_SESSION':
      case 'BOOK_NEXT_SESSION':
      case 'START_GUIDED_MATCHING':
      case 'TAKE_ASSESSMENT':
      case 'VIEW_SUPPORT_TICKET':
        return {
          type: recommendation.type,
          priority: recommendation.priority,
          reasonCode: recommendation.reasonCode,
          reasonText: recommendation.reasonText,
          action: recommendation.action,
          entityRefs: recommendation.entityRefs,
          expiresAt: recommendation.expiresAt,
          label: recommendation.label,
        };
      default:
        return null;
    }
  }

  private deduplicate(
    input: PatientJourneyNextStepViewModel[],
  ): PatientJourneyNextStepViewModel[] {
    const seen = new Set<PatientJourneyNextStepType>();
    return input.filter((item) => {
      if (seen.has(item.type)) {
        return false;
      }
      seen.add(item.type);
      return true;
    });
  }

  private resolveConflicts(
    input: PatientJourneyNextStepViewModel[],
  ): PatientJourneyNextStepViewModel[] {
    if (input.length === 0) {
      return input;
    }

    const hasCompletePayment = input.some(
      (item) => item.type === 'COMPLETE_PAYMENT',
    );
    const hasJoinUpcoming = input.some(
      (item) => item.type === 'JOIN_UPCOMING_SESSION',
    );
    const hasBookNext = input.some((item) => item.type === 'BOOK_NEXT_SESSION');

    return input.filter((item) => {
      if (item.type === 'VIEW_SUPPORT_TICKET') {
        return true;
      }

      if (hasCompletePayment) {
        return item.type === 'COMPLETE_PAYMENT';
      }

      if (hasJoinUpcoming) {
        return item.type === 'JOIN_UPCOMING_SESSION';
      }

      if (hasBookNext) {
        return (
          item.type === 'BOOK_NEXT_SESSION' || item.type === 'TAKE_ASSESSMENT'
        );
      }

      return true;
    });
  }
}
