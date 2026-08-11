import { Injectable } from '@nestjs/common';
import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import {
  resolveSessionChatAvailability,
} from '@modules/sessions/utils/session-chat-policy.util';

export interface SessionChatAvailabilityFacts {
  status: SessionStatus;
  sessionMode: SessionMode;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  provider: SessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
}

/**
 * Chat-owned eligibility for opening the deterministic Session Chat.
 * This is deliberately independent from conversation existence and runs only
 * against Session facts already loaded by the caller.
 */
@Injectable()
export class ResolveSessionChatAvailabilityService {
  resolve(input: SessionChatAvailabilityFacts): { available: boolean } {
    return {
      available: resolveSessionChatAvailability({
        ...input,
        now: new Date(),
      }).canRead,
    };
  }
}
