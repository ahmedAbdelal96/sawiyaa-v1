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
