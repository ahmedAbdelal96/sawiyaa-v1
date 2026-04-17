import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';

@Injectable()
export class InspectAdminSessionRuntimeUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly resolveSessionJoinReadinessService: ResolveSessionJoinReadinessService,
  ) {}

  async execute(input: { sessionId: string }) {
    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const readiness = this.resolveSessionJoinReadinessService.resolve({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      now: new Date(),
    });

    return {
      item: {
        id: session.id,
        sessionCode: session.sessionCode,
        status: session.status,
        sessionMode: session.sessionMode,
        scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
        scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
        provider: session.provider,
        providerRoomId: session.providerRoomId,
        providerSessionRef: session.providerSessionRef,
        canPrepareRuntime: readiness.canPrepareRuntime,
        canJoin: readiness.canJoin,
        blockedReason: readiness.blockedReason,
      },
    };
  }
}
