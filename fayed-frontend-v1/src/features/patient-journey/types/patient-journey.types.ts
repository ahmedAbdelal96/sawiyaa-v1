import type { PaymentStatus } from "@/features/payments/types/payments.types";
import type { SessionMode, SessionStatus } from "@/features/sessions/types/sessions.types";

export type PatientJourneyNextStepType =
  | "COMPLETE_PAYMENT"
  | "JOIN_UPCOMING_SESSION"
  | "VIEW_SUPPORT_TICKET"
  | "BOOK_NEXT_SESSION"
  | "START_GUIDED_MATCHING"
  | "TAKE_ASSESSMENT";

export type PatientJourneyPractitionerSummary = {
  slug: string;
  displayName: string | null;
};

export type PatientJourney = {
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
      practitioner: PatientJourneyPractitionerSummary;
    } | null;
    pendingPayment: {
      id: string;
      status: PaymentStatus;
      amount: string;
      currency: string;
      sessionId: string | null;
      createdAt: string;
    } | null;
    instantBookingRequest: {
      id: string;
      status: string;
      requestedAt: string;
      expiresAt: string;
      durationMinutes: number;
      sessionMode: SessionMode;
      practitioner: PatientJourneyPractitionerSummary;
    } | null;
  };
  recentHistory: {
    sessions: Array<{
      id: string;
      status: SessionStatus;
      scheduledStartAt: string | null;
      scheduledEndAt: string | null;
      practitioner: PatientJourneyPractitionerSummary;
    }>;
    assessments: Array<{
      id: string;
      assessmentSlug: string;
      assessmentTitle: string;
      completedAt: string | null;
      band: string | null;
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
      category: string;
      status: string;
      updatedAt: string;
    } | null;
  };
  nextSteps: Array<{
    type: PatientJourneyNextStepType;
    label: string;
  }>;
};

export type PatientJourneyResponseData = {
  item: PatientJourney;
};
