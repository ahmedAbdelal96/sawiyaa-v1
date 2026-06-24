import { SessionProvider, SessionStatus } from '@prisma/client';

export type SessionJoinBlockedReason =
  | 'SESSION_NOT_JOINABLE_STATUS'
  | 'SESSION_NOT_VIDEO_MODE'
  | 'SESSION_TIME_WINDOW_NOT_OPEN'
  | 'SESSION_RUNTIME_NOT_PREPARED'
  | 'SESSION_JOIN_WINDOW_CLOSED';

export type SessionPresentationStatus =
  | 'UPCOMING'
  | 'JOINABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ENDED'
  | 'UNAVAILABLE'
  | 'NO_SHOW'
  | 'UNDER_REVIEW';

export enum SessionPresentationFilter {
  ALL = 'all',
  JOINABLE = 'joinable',
  LIVE = 'live',
  UPCOMING = 'upcoming',
  FINISHED = 'finished',
  UNAVAILABLE = 'unavailable',
}

export interface SessionRuntimeViewModel {
  provider: SessionProvider;
  roomName: string | null;
  roomUrl: string | null;
  isPrepared: boolean;
  providerRuntime: SessionVideoProviderRuntimeViewModel | null;
}

export interface SessionJoinContractViewModel {
  sessionId: string;
  status: SessionStatus;
  provider: SessionProvider;
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  availableAt: string | null;
  expiresAt: string | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
  providerRuntime: SessionVideoProviderRuntimeViewModel;
}

export interface SessionVideoProviderRuntimeViewModel {
  name: SessionProvider;
  roomId: string | null;
  roomUrl: string | null;
  token: string | null;
  tokenExpiresAt: string | null;
  joinMode: 'redirect_url' | 'embedded' | 'external_url' | null;
  payload: Record<string, unknown>;
}
