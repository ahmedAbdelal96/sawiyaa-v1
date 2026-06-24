import { SessionProvider } from '@prisma/client';

export interface SessionVideoRoomResult {
  roomId: string;
  roomUrl: string;
  roomName?: string;
  raw?: unknown;
}

export interface SessionVideoJoinTokenResult {
  token: string;
  expiresAt?: Date | string | null;
  joinMode?: 'redirect_url' | 'embedded' | 'external_url';
  payload?: Record<string, unknown>;
  raw?: unknown;
}

export interface SessionVideoProviderAdapter {
  readonly provider: SessionProvider;

  createRoom(input: {
    sessionId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<SessionVideoRoomResult>;

  createJoinToken(input: {
    roomId: string;
    userId: string;
    displayName: string | null;
    actorType: 'PATIENT' | 'PRACTITIONER';
  }): Promise<SessionVideoJoinTokenResult>;
}
