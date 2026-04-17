import { SessionProvider } from '@prisma/client';

export interface SessionVideoRoomResult {
  roomName: string;
  roomUrl: string;
}

export interface SessionVideoJoinTokenResult {
  token: string;
}

export interface SessionVideoProviderAdapter {
  readonly provider: SessionProvider;

  createRoom(input: {
    sessionId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<SessionVideoRoomResult>;

  createJoinToken(input: {
    roomName: string;
    userId: string;
    displayName: string | null;
    actorType: 'PATIENT' | 'PRACTITIONER';
  }): Promise<SessionVideoJoinTokenResult>;
}
