import { PresenceStatus } from '@prisma/client';

/**
 * Presence view-model types keep live-state contracts explicit and separate from availability or session orchestration.
 */
export interface PractitionerPresenceViewModel {
  status: PresenceStatus;
  isInstantBookingEnabled: boolean;
  lastSeenAt: string | null;
  lastHeartbeatAt: string | null;
  manuallySetAt: string | null;
  updatedAt: string | null;
}
