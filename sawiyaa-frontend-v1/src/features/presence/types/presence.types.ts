/**
 * Frontend types for the Presence module.
 * Derived directly from backend DTOs:
 *   - PresenceResponseDto (authenticated read)
 *   - PractitionerPresenceViewModel
 *   - SetMyPresenceStatusDto
 *   - SetMyInstantBookingAvailabilityDto
 */

export type PresenceStatus = "OFFLINE" | "ONLINE" | "AWAY" | "BUSY";

export type PractitionerPresence = {
  status: PresenceStatus;
  isInstantBookingEnabled: boolean;
  lastSeenAt: string | null;
  lastHeartbeatAt: string | null;
  manuallySetAt: string | null;
  updatedAt: string | null;
};

/**
 * Shape returned by GET/PUT /practitioners/me/presence/* (after extractData).
 * The backend wraps the actual presence in a { message, presence } envelope.
 */
export type MyPresenceData = {
  message: string;
  presence: PractitionerPresence;
};

/** Payload for PUT /practitioners/me/presence/status */
export type SetPresenceStatusInput = {
  status: PresenceStatus;
};

/** Payload for PUT /practitioners/me/presence/instant-booking */
export type SetInstantBookingInput = {
  isInstantBookingEnabled: boolean;
};
