export type BookingDuration = 30 | 60;

export type SessionMode = "VIDEO" | "AUDIO";

export type CreateScheduledSessionInput = {
  practitionerSlug: string;
  scheduledStartAt: string;
  durationMinutes: BookingDuration;
  sessionMode?: SessionMode;
};

export type SessionItem = {
  id: string;
  sessionCode: string;
  status: string;
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
};

export type SessionItemDataResponse = {
  item: SessionItem;
};
