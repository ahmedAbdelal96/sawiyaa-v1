import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SessionAdminDecisionType,
  SessionMode,
  SessionProvider,
  SessionStatus,
} from '@prisma/client';
import {
  resolveSessionJoinPolicy,
  SessionJoinPolicyResolution,
} from '../utils/session-join-policy.util';

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
      videoRoomClosedAt?: Date | null;
      joinOpenAt?: Date | null;
      joinCloseAt?: Date | null;
      joinEarlyMinutes?: number;
      joinAfterEndGraceMinutes?: number;
      finalManualDecision?: SessionAdminDecisionType | null;
      now: Date;
  }): SessionJoinPolicyResolution {
    // This is the single injected read-policy boundary. Commands call it again
    // with fresh Session facts before any provider or credential side effect.
    return resolveSessionJoinPolicy({
      ...input,
      runtimePrepareLeadMinutes: this.prepareLeadMinutes,
    });
  }
}
