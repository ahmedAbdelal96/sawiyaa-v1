import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { SessionJoinBlockedReason } from '../types/session-video.types';
import { resolveSessionJoinPolicy } from '../utils/session-join-policy.util';

@Injectable()
export class ResolveSessionJoinReadinessService {
  private readonly prepareLeadMinutes: number;

  constructor(private readonly configService: ConfigService) {
    this.prepareLeadMinutes =
      this.configService.get<number>('session.runtimePrepareLeadMinutes') ??
      24 * 60;
  }

  resolve(input: {
    status: SessionStatus;
    sessionMode: SessionMode;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    provider: SessionProvider;
    providerRoomId: string | null;
    providerSessionRef: string | null;
    now: Date;
  }): {
    canPrepareRuntime: boolean;
    canJoin: boolean;
    blockedReason: SessionJoinBlockedReason | null;
  } {
    const resolution = resolveSessionJoinPolicy({
      ...input,
      runtimePrepareLeadMinutes: this.prepareLeadMinutes,
    });

    return {
      canPrepareRuntime: resolution.canPrepareRuntime,
      canJoin: resolution.canJoin,
      blockedReason: resolution.blockedReason,
    };
  }
}
