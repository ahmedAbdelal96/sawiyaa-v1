import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { SessionJoinBlockedReason } from '../types/session-video.types';

@Injectable()
export class ResolveSessionJoinReadinessService {
  private readonly joinAllowedStatuses = new Set<SessionStatus>([
    SessionStatus.CONFIRMED,
    SessionStatus.UPCOMING,
    SessionStatus.READY_TO_JOIN,
    SessionStatus.IN_PROGRESS,
  ]);

  private readonly prepareLeadMinutes: number;
  private readonly joinLeadMinutes: number;
  private readonly joinLagMinutes: number;

  constructor(private readonly configService: ConfigService) {
    this.prepareLeadMinutes =
      this.configService.get<number>('session.runtimePrepareLeadMinutes') ??
      24 * 60;
    this.joinLeadMinutes =
      this.configService.get<number>('session.joinLeadMinutes') ?? 15;
    this.joinLagMinutes =
      this.configService.get<number>('session.joinLagMinutes') ?? 120;
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
    if (input.sessionMode !== SessionMode.VIDEO) {
      return {
        canPrepareRuntime: false,
        canJoin: false,
        blockedReason: 'SESSION_NOT_VIDEO_MODE',
      };
    }

    if (!this.joinAllowedStatuses.has(input.status)) {
      return {
        canPrepareRuntime: false,
        canJoin: false,
        blockedReason: 'SESSION_NOT_JOINABLE_STATUS',
      };
    }

    if (!input.scheduledStartAt || !input.scheduledEndAt) {
      return {
        canPrepareRuntime: false,
        canJoin: false,
        blockedReason: 'SESSION_TIME_WINDOW_NOT_OPEN',
      };
    }

    const prepareOpensAt = new Date(
      input.scheduledStartAt.getTime() - this.prepareLeadMinutes * 60_000,
    );
    const joinOpensAt = new Date(
      input.scheduledStartAt.getTime() - this.joinLeadMinutes * 60_000,
    );
    const joinClosesAt = new Date(
      input.scheduledEndAt.getTime() + this.joinLagMinutes * 60_000,
    );

    const canPrepareRuntime =
      input.now >= prepareOpensAt && input.now <= joinClosesAt;
    const runtimePrepared =
      input.provider === SessionProvider.DAILY &&
      Boolean(input.providerRoomId) &&
      Boolean(input.providerSessionRef);
    const inJoinWindow = input.now >= joinOpensAt && input.now <= joinClosesAt;

    if (!canPrepareRuntime || !inJoinWindow) {
      return {
        canPrepareRuntime,
        canJoin: false,
        blockedReason: 'SESSION_TIME_WINDOW_NOT_OPEN',
      };
    }

    if (!runtimePrepared) {
      return {
        canPrepareRuntime,
        canJoin: false,
        blockedReason: 'SESSION_RUNTIME_NOT_PREPARED',
      };
    }

    return {
      canPrepareRuntime,
      canJoin: true,
      blockedReason: null,
    };
  }
}
