import {
  AssessmentResultBand,
  InstantBookingRequestStatus,
  PaymentStatus,
  SessionMode,
  SessionStatus,
  SupportTicketStatus,
  SupportTicketType,
} from '@prisma/client';

export const PATIENT_JOURNEY_NEXT_STEP_VALUES = [
  'COMPLETE_PAYMENT',
  'JOIN_UPCOMING_SESSION',
  'VIEW_SUPPORT_TICKET',
  'BOOK_NEXT_SESSION',
  'START_GUIDED_MATCHING',
  'TAKE_ASSESSMENT',
] as const;

export type PatientJourneyNextStepType =
  (typeof PATIENT_JOURNEY_NEXT_STEP_VALUES)[number];

export interface PatientJourneyNextStepViewModel {
  type: PatientJourneyNextStepType;
  priority: number;
  reasonCode: string;
  reasonText: string;
  action: {
    type: string;
    targetType: string | null;
    targetId: string | null;
  };
  entityRefs: Array<{
    entityType: string;
    entityId: string;
  }>;
  expiresAt: string | null;
  label: string | null;
}

export interface PatientJourneyLegacyNextStepSummary {
  type: PatientJourneyNextStepType;
  label: string;
}

export interface PatientJourneyViewModel {
  summary: {
    hasUpcomingSession: boolean;
    nextSessionAt: string | null;
    hasPendingPayment: boolean;
    hasOpenSupportTicket: boolean;
    lastAssessmentTakenAt: string | null;
    lastMatchingAt: string | null;
    suggestedNextAction: PatientJourneyNextStepType;
  };
  upcoming: {
    session: {
      id: string;
      status: SessionStatus;
      scheduledStartAt: string | null;
      scheduledEndAt: string | null;
      practitioner: {
        slug: string;
        displayName: string | null;
      };
    } | null;
    pendingPayment: {
      id: string;
      status: PaymentStatus;
      amount: string;
      currency: string;
      sessionId: string | null;
      createdAt: string;
      expiredAt: string | null;
    } | null;
    instantBookingRequest: {
      id: string;
      status: InstantBookingRequestStatus;
      requestedAt: string;
      expiresAt: string;
      durationMinutes: number;
      sessionMode: SessionMode;
      practitioner: {
        slug: string;
        displayName: string | null;
      };
    } | null;
  };
  recentHistory: {
    sessions: Array<{
      id: string;
      status: SessionStatus;
      scheduledStartAt: string | null;
      scheduledEndAt: string | null;
      practitioner: {
        slug: string;
        displayName: string | null;
      };
    }>;
    assessments: Array<{
      id: string;
      assessmentSlug: string;
      assessmentTitle: string;
      completedAt: string | null;
      band: AssessmentResultBand | null;
      score: number | null;
    }>;
    matching: Array<{
      id: string;
      completedAt: string | null;
      topRecommendation: {
        practitionerSlug: string;
        practitionerDisplayName: string | null;
        score: number;
      } | null;
    }>;
    payments: Array<{
      id: string;
      status: PaymentStatus;
      amount: string;
      currency: string;
      createdAt: string;
      sessionId: string | null;
    }>;
  };
  support: {
    hasOpenTicket: boolean;
    latestOpenTicket: {
      id: string;
      category: SupportTicketType;
      status: SupportTicketStatus;
      updatedAt: string;
    } | null;
  };
  linkedContent: Array<{
    article: {
      id: string;
      title: string;
      slug: string;
      excerpt: string | null;
      coverImageUrl: string | null;
      publishedAt: string | null;
      category: {
        id: string;
        slugRoot: string;
        slug: string;
        title: string;
      } | null;
      trust: {
        freshnessBand: 'NEW' | 'RECENT' | 'ESTABLISHED' | 'UNPUBLISHED';
        isFreshContent: boolean;
        authorDisplayName: string | null;
        reasonCodes: string[];
      };
    };
    priority: number;
    reasonCode: string;
    reasonText: string;
  }>;
  nextSteps: PatientJourneyNextStepViewModel[];
}
