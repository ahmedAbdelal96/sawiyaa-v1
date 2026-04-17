/**
 * Frontend types for the instant-booking feature.
 * Derived directly from backend InstantBookingRequestViewModel and Prisma enums.
 */

/**
 * Maps to Prisma InstantBookingRequestStatus enum.
 * PENDING  — awaiting practitioner response
 * ACCEPTED — practitioner accepted; a session has been created (createdSessionId is set)
 * REJECTED — practitioner rejected
 * EXPIRED  — the acceptance window passed without a response
 * CANCELLED — patient cancelled the request before response
 */
export type InstantBookingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type SessionMode = "VIDEO";

export type InstantBookingParticipantSummary = {
  id: string;
  displayName: string | null;
};

export type InstantBookingPractitionerSummary = {
  id: string;
  slug: string;
  displayName: string | null;
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
