import { SessionMode, SessionStatus } from '@prisma/client';
import { GeneralChatAvailabilityViewModel } from '@modules/chat/types/general-chat.types';
import { SessionJoinBlockedReason } from './session-video.types';
import type { PatientSessionActionsViewModel } from '../services/resolve-patient-session-actions.service';
import type { SessionOperationalInterpretation } from './session-operational-interpretation.types';

/**
 * Session view-model types keep API contracts stable while the persistence model remains richer for later integrations.
 */
export interface SessionListItemViewModel {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  createdAt: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
  };
  patient: {
    id: string;
    displayName: string | null;
  } | null;
  actions: PatientSessionActionsViewModel;
  chatAvailability: GeneralChatAvailabilityViewModel;
  unreadCount?: number;
  hasUnread?: boolean;
  /** Additive Phase 2B canonical operational contract. */
  operational?: SessionOperationalInterpretation;
}

export interface SessionDetailsViewModel extends SessionListItemViewModel {
  sessionChat?: {
    available: boolean;
  };
  flowType: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  timezone: string | null;
  videoRoomClosedAt: string | null;
  videoRoomCloseReason: string | null;
  videoRoomCloseNote: string | null;
  paymentCoverageType: string;
  packagePurchase: {
    id: string;
    packagePlanId: string;
    packagePlan: {
      id: string;
      code: string;
      title: string;
      discountPercent: number;
    };
  } | null;
  conversationId: string | null;
  patientDetails: {
    dateOfBirth: string | null;
    gender: string | null;
    preferredLanguage: string | null;
    country: {
      isoCode: string;
      name: string;
      nativeName: string | null;
    } | null;
  } | null;
  practitionerDetails: {
    professionalTitle: string | null;
    avatarUrl: string | null;
    specialties: Array<{
      id: string;
      nameAr: string | null;
      nameEn: string | null;
      isPrimary: boolean;
    }>;
  } | null;
  paymentDetails: {
    id: string;
    paymentPurpose: string;
    status: string;
    amountTotal: number;
    currencyCode: string;
    provider: string;
    initiatedAt: string;
  } | null;
  corporateSponsorshipDetails: {
    id: string;
    coverageType: string;
    originalAmount: number;
    coveredAmount: number;
    patientPayAmount: number;
    currency: string;
    benefitPlanName: string;
    organizationName: string;
  } | null;
  reviewDetails: {
    id: string;
    ratingValue: number;
    reviewTitle: string | null;
    reviewText: string | null;
    submittedAt: string | null;
  } | null;
  timeline: Array<{
    eventType: string;
    occurredAt: string;
    actorType: string | null;
    reason: string | null;
  }>;
}

export interface SessionJoinAvailabilityViewModel {
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
}
