export type PresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

export interface PractitionerPresence {
  status: PresenceStatus;
  isInstantBookingEnabled: boolean;
  lastSeenAt: string | null;
  lastHeartbeatAt: string | null;
  manuallySetAt: string | null;
  updatedAt: string | null;
}

export interface PresenceResponse {
  message: string;
  presence: PractitionerPresence;
}

export interface SetPresenceStatusPayload {
  status: PresenceStatus;
}

export interface SetInstantBookingPayload {
  isInstantBookingEnabled: boolean;
}
