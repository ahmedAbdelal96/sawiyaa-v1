import {
  AssessmentResultBand,
  PaymentStatus,
  SessionStatus,
  SupportTicketStatus,
} from '@prisma/client';
import { AssessmentCareIntentInterpretation } from './assessment-interpretation.types';

export type CareContinuityStage =
  | 'PAYMENT_BLOCKED'
  | 'UPCOMING_SESSION'
  | 'ACTIVE_CARE'
  | 'RETURNING'
  | 'NEW';

export type RawCareSignalSnapshot = {
  patientProfileId: string;
  userId: string;
  patientCountryIsoCode: string | null;
  userTimezone: string | null;
  latestAssessmentCompletedAt: Date | null;
  latestAssessmentBand: AssessmentResultBand | null;
  upcomingSessionStatus: SessionStatus | null;
  hasPastSession: boolean;
  pendingPaymentStatus: PaymentStatus | null;
  hasRecentMatchingSession: boolean;
  hasOpenSupportTicket: boolean;
  latestSupportTicketStatus: SupportTicketStatus | null;
  hasActiveAcademyEnrollment: boolean;
};

export type NormalizedCareSignalContext = {
  profile: {
    patientProfileId: string;
    userId: string;
    countryCode: string | null;
    timezone: string | null;
  };
  assessments: {
    hasCompletedAssessment: boolean;
    latestBand: AssessmentResultBand | null;
    latestCompletedAt: string | null;
    interpretation: AssessmentCareIntentInterpretation;
  };
  sessions: {
    hasUpcomingSession: boolean;
    upcomingStatus: SessionStatus | null;
    hasPastSession: boolean;
  };
  payments: {
    hasPendingPayment: boolean;
    pendingStatus: PaymentStatus | null;
  };
  matching: {
    hasRecentSession: boolean;
  };
  academy: {
    hasActiveEnrollment: boolean;
  };
  support: {
    hasOpenTicket: boolean;
    latestOpenTicketStatus: SupportTicketStatus | null;
  };
  continuity: {
    stage: CareContinuityStage;
    rulesApplied: string[];
  };
};
