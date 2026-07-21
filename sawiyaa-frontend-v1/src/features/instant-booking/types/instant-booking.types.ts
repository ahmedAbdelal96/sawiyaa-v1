/**
 * Frontend types for the instant-booking feature.
 * Derived directly from backend request/discovery DTOs.
 */

/**
 * Maps to Prisma InstantBookingRequestStatus enum.
 * PENDING  - awaiting practitioner response
 * ACCEPTED - practitioner accepted; a session has been created (createdSessionId is set)
 * REJECTED - practitioner rejected
 * EXPIRED  - the acceptance window passed without a response
 * CANCELLED - patient cancelled the request before response
 */
export type InstantBookingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type SessionMode = "VIDEO" | "AUDIO";

export type InstantBookingParticipantSummary = {
  id: string;
  displayName: string | null;
};

export type InstantBookingPractitionerSummary = {
  id: string;
  slug: string;
  displayName: string | null;
};

export type InstantBookingDiscoveryDuration = 30 | 60;
export type InstantBookingDiscoveryCurrency = "EGP" | "USD";

export type InstantBookingEligiblePractitionerPricing = {
  EGP?: Partial<Record<InstantBookingDiscoveryDuration, string>>;
  USD?: Partial<Record<InstantBookingDiscoveryDuration, string>>;
};

export type InstantBookingEligiblePractitionerItem = {
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
};

export type InstantBookingEligiblePractitionersMeta = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  generatedAt: string;
};

export type InstantBookingEligiblePractitionersResponseData = {
  items: InstantBookingEligiblePractitionerItem[];
  meta: InstantBookingEligiblePractitionersMeta;
  currencyCode: InstantBookingDiscoveryCurrency;
};

export type CreatePatientInstantBookingRequestInput = {
  practitionerSlug: string;
  durationMinutes: InstantBookingDiscoveryDuration;
  sessionMode?: SessionMode;
};

/**
 * Shape returned by all instant-booking request endpoints after extractData.
 * Maps to backend InstantBookingRequestViewModel.
 */
export type InstantBookingRequest = {
  id: string;
  status: InstantBookingRequestStatus;
  requestedDurationMinutes: number;
  sessionMode: SessionMode;
  requestedAt: string;
  expiresAt: string;
  respondedAt: string | null;
  responseReason: string | null;
  /** The session created from this request after acceptance. Null until accepted. */
  createdSessionId: string | null;
  practitioner: InstantBookingPractitionerSummary;
  patient: InstantBookingParticipantSummary | null;
};

export type InstantBookingRequestResponseData = {
  item: InstantBookingRequest;
};

export type InstantBookingRequestsListResponseData = {
  items: InstantBookingRequest[];
};
