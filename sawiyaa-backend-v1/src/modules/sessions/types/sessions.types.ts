import { SessionMode, SessionStatus } from '@prisma/client';
import { GeneralChatAvailabilityViewModel } from '@modules/chat/types/general-chat.types';
import {
  SessionJoinBlockedReason,
  SessionPresentationStatus,
} from './session-video.types';
import type { PatientSessionActionsViewModel } from '../services/resolve-patient-session-actions.service';

/**
 * Session view-model types keep API contracts stable while the persistence model remains richer for later integrations.
 */
export interface SessionListItemViewModel {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  presentationStatus: SessionPresentationStatus;
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
  joinAvailability: SessionJoinAvailabilityViewModel;
  actions: PatientSessionActionsViewModel;
  chatAvailability: GeneralChatAvailabilityViewModel;
  unreadCount?: number;
  hasUnread?: boolean;
}

export interface SessionDetailsViewModel extends SessionListItemViewModel {
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
