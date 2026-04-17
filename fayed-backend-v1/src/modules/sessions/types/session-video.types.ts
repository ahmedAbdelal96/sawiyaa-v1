import { SessionProvider, SessionStatus } from '@prisma/client';

export type SessionJoinBlockedReason =
  | 'SESSION_NOT_JOINABLE_STATUS'
  | 'SESSION_NOT_VIDEO_MODE'
  | 'SESSION_TIME_WINDOW_NOT_OPEN'
  | 'SESSION_RUNTIME_NOT_PREPARED';

export interface SessionRuntimeViewModel {
  provider: SessionProvider;
  roomName: string | null;
  roomUrl: string | null;
  isPrepared: boolean;
}

export interface SessionJoinContractViewModel {
  sessionId: string;
  status: SessionStatus;
  provider: SessionProvider;
  canJoin: boolean;
  blockedReason: SessionJoinBlockedReason | null;
  roomName: string | null;
  roomUrl: string | null;
  joinToken: string | null;
}
