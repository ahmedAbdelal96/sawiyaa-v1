import { InstantBookingRequestStatus, SessionMode } from '@prisma/client';

export interface InstantBookingRequestViewModel {
  id: string;
  status: InstantBookingRequestStatus;
  requestedDurationMinutes: number;
  sessionMode: SessionMode;
  requestedAt: string;
  expiresAt: string;
  respondedAt: string | null;
  responseReason: string | null;
  createdSessionId: string | null;
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
  };
  patient: {
    id: string;
    displayName: string | null;
  } | null;
}

export interface InstantBookingEligiblePractitionerPricingViewModel {
  EGP?: {
    30?: string;
    60?: string;
  };
  USD?: {
    30?: string;
    60?: string;
  };
}

export interface InstantBookingEligiblePractitionerViewModel {
  practitionerId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  primarySpecialty: string | null;
  title: string | null;
  isOnline: boolean;
  availableNow: boolean;
  instantBookingEnabled: boolean;
  earliestStartAt: string;
  currentWindowEndsAt: string;
  supportedDurations: number[];
  instantBookingPricing: InstantBookingEligiblePractitionerPricingViewModel;
  shortBio: string | null;
  rating: number | null;
  completedSessionsCount: number | null;
}

export interface InstantBookingEligiblePractitionersMetaViewModel {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  generatedAt: string;
}

export interface InstantBookingEligiblePractitionersListViewModel {
  items: InstantBookingEligiblePractitionerViewModel[];
  meta: InstantBookingEligiblePractitionersMetaViewModel;
}
