export type SessionItem = {
  id: string;
  sessionCode: string;
  status: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: "VIDEO" | "AUDIO";
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

export type SessionDetails = SessionItem & {
  flowType: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  expiredAt: string | null;
  timezone: string | null;
};

export type SessionsListDataResponse = {
  items: SessionItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type SessionItemDataResponse = {
  item: SessionDetails;
};

export type SessionRuntime = {
  provider: string;
  isPrepared: boolean;
  roomName: string | null;
  roomUrl: string | null;
};

export type SessionRuntimeDataResponse = {
  item: SessionRuntime;
};

export type SessionJoinContract = {
  sessionId: string;
  status: string;
  provider: string;
  canJoin: boolean;
  blockedReason: string | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
};

export type SessionJoinDataResponse = {
  item: SessionJoinContract;
};
