export type InstantBookingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type InstantBookingSessionMode = "VIDEO" | "AUDIO";

export type InstantBookingDiscoveryDuration = 30 | 60;
export type InstantBookingDiscoveryCurrency = "EGP" | "USD";

export interface InstantBookingPractitionerSummary {
  id: string;
  slug: string;
  displayName: string | null;
}

export interface InstantBookingParticipantSummary {
  id: string;
  displayName: string | null;
}

export interface InstantBookingEligiblePractitionerPricing {
  EGP?: Partial<Record<InstantBookingDiscoveryDuration, string>>;
  USD?: Partial<Record<InstantBookingDiscoveryDuration, string>>;
}

export interface InstantBookingEligiblePractitionerItem {
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
  supportedDurations: InstantBookingDiscoveryDuration[];
  instantBookingPricing: InstantBookingEligiblePractitionerPricing;
  shortBio: string | null;
  rating: number | null;
  completedSessionsCount: number | null;
}

export interface InstantBookingEligiblePractitionersMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  generatedAt: string;
}

export interface InstantBookingEligiblePractitionersResponse {
  items: InstantBookingEligiblePractitionerItem[];
  meta: InstantBookingEligiblePractitionersMeta;
}

export interface CreatePatientInstantBookingRequestInput {
  practitionerSlug: string;
  durationMinutes: InstantBookingDiscoveryDuration;
  sessionMode?: InstantBookingSessionMode;
}

export interface InstantBookingRequest {
  id: string;
  status: InstantBookingRequestStatus;
  requestedDurationMinutes: number;
  sessionMode: InstantBookingSessionMode;
  requestedAt: string;
  expiresAt: string;
  respondedAt: string | null;
  responseReason: string | null;
  createdSessionId: string | null;
  practitioner: InstantBookingPractitionerSummary;
  patient: InstantBookingParticipantSummary | null;
}

export interface InstantBookingRequestResponse {
  item: InstantBookingRequest;
}

export interface InstantBookingRequestsResponse {
  items: InstantBookingRequest[];
}

