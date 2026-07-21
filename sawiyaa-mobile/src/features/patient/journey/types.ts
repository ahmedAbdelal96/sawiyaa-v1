import type { SessionStatus, PaymentStatus } from "../sessions/types";
import type { SupportTicketStatus, SupportTicketType } from "../support/types";

export type PatientJourneyNextStepType =
  | "COMPLETE_PAYMENT"
  | "JOIN_UPCOMING_SESSION"
  | "VIEW_SUPPORT_TICKET"
  | "BOOK_NEXT_SESSION"
  | "START_GUIDED_MATCHING"
  | "TAKE_ASSESSMENT";

export type AssessmentResultBand = "LOW" | "MILD" | "MODERATE" | "HIGH";

export type InstantBookingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type SessionMode = "VIDEO" | "AUDIO" | "CHAT";

export interface JourneyPractitionerSummaryDto {
  slug: string;
  displayName: string | null;
}

export interface JourneyUpcomingSessionDto {
  id: string;
  status: SessionStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  practitioner: JourneyPractitionerSummaryDto;
}

export interface JourneyPendingPaymentDto {
  id: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  sessionId: string | null;
  createdAt: string;
}

export interface JourneyUpcomingInstantBookingDto {
  id: string;
  status: InstantBookingRequestStatus;
  requestedAt: string;
  expiresAt: string;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: JourneyPractitionerSummaryDto;
}

export interface JourneyUpcomingDto {
  session: JourneyUpcomingSessionDto | null;
  pendingPayment: JourneyPendingPaymentDto | null;
  instantBookingRequest: JourneyUpcomingInstantBookingDto | null;
}

export interface JourneyHistorySessionDto {
  id: string;
  status: SessionStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  practitioner: JourneyPractitionerSummaryDto;
}

export interface JourneyHistoryAssessmentDto {
  id: string;
  assessmentSlug: string;
  assessmentTitle: string;
  completedAt: string | null;
  band: AssessmentResultBand | null;
  score: number | null;
}

export interface JourneyHistoryMatchingDto {
  id: string;
  completedAt: string | null;
  topRecommendation: {
    practitionerSlug: string;
    practitionerDisplayName: string | null;
    score: number;
  } | null;
}

export interface JourneyHistoryPaymentDto {
  id: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  createdAt: string;
  sessionId: string | null;
}

export interface JourneyRecentHistoryDto {
  sessions: JourneyHistorySessionDto[];
  assessments: JourneyHistoryAssessmentDto[];
  matching: JourneyHistoryMatchingDto[];
  payments: JourneyHistoryPaymentDto[];
}

export interface JourneySupportDto {
  hasOpenTicket: boolean;
  latestOpenTicket: {
    id: string;
    category: SupportTicketType;
    status: SupportTicketStatus;
    updatedAt: string;
  } | null;
}

export interface CareRecommendationActionDto {
  type: string;
  label: string;
  route?: string;
  entityId?: string;
}

export interface CareRecommendationEntityRefDto {
  kind: string;
  id: string;
}

export interface PatientJourneyNextStepDto {
  type: PatientJourneyNextStepType;
  label: string;
  priority: number;
  reasonCode: string;
  reasonText: string;
  action: CareRecommendationActionDto;
  entityRefs: CareRecommendationEntityRefDto[];
  expiresAt: string | null;
}

export interface PatientJourneySummaryDto {
  hasUpcomingSession: boolean;
  nextSessionAt: string | null;
  hasPendingPayment: boolean;
  hasOpenSupportTicket: boolean;
  lastAssessmentTakenAt: string | null;
  lastMatchingAt: string | null;
  suggestedNextAction: PatientJourneyNextStepType;
}

export interface PatientJourneyResponseDto {
  summary: PatientJourneySummaryDto;
  upcoming: JourneyUpcomingDto;
  recentHistory: JourneyRecentHistoryDto;
  support: JourneySupportDto;
  nextSteps: PatientJourneyNextStepDto[];
}

export type PatientHomeModuleStatus =
  | "READY"
  | "NOT_IMPLEMENTED"
  | "IMPLEMENTED";

export interface PatientHomePractitionerItemDto {
  practitionerId: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  avatarUrl: string | null;
  primarySpecialty: string | null;
  averageRating: number | null;
  totalReviews: number;
  displaySessionPrice30: number | null;
  displaySessionPrice60: number | null;
  isVerified: boolean;
  badgeLabel?: string | null;
  lastViewedAt?: string;
}

export interface PatientHomePractitionerModuleDto {
  label: string;
  status?: PatientHomeModuleStatus;
  items: PatientHomePractitionerItemDto[];
  currencyCode: "EGP" | "USD";
}

export type PatientHomeCardCtaKey = "MATCHING_INTRO" | "SUPPORT_HOME";

export interface PatientHomeCardDto {
  label: string;
  title: string;
  description: string;
  ctaKey: PatientHomeCardCtaKey;
}

export interface PatientHomeResponseDto {
  currencyCode: "EGP" | "USD";
  featuredPractitioners: PatientHomePractitionerModuleDto;
  recentlyVisitedPractitioners: PatientHomePractitionerModuleDto;
  mostBookedTodayPractitioners: PatientHomePractitionerModuleDto;
  topRatedPractitioners: PatientHomePractitionerModuleDto;
  matchingCard: PatientHomeCardDto;
  supportCard: PatientHomeCardDto;
}

export interface TrackPractitionerViewResponseDto {
  slug: string;
  trackedAt: string;
}
