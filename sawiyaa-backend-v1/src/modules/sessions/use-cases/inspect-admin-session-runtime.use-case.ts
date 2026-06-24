import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';
import { buildParticipantsSummary, type SessionWithParticipants } from '../utils/session-participant-identity.util';
import { resolveSessionPresentationStatus } from '../utils/session-join-policy.util';

@Injectable()
export class InspectAdminSessionRuntimeUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly resolveSessionJoinReadinessService: ResolveSessionJoinReadinessService,
  ) {}

  async execute(input: { sessionId: string }) {
    // Phase 3 — fetch the session with the participant identity include so
    // we can surface patient/practitioner display names + primary contact
    // details. Kept separate from findById to avoid expanding the data
    // surface for unrelated callers.
    const session = await this.sessionRepository.findByIdWithParticipants(
      input.sessionId,
    );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const now = new Date();
    const readiness = this.resolveSessionJoinReadinessService.resolve({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      now,
    });

    const participants = buildParticipantsSummary(
      session as unknown as SessionWithParticipants,
    );
    // Fetch final manual decision if one exists to override presentationStatus
    const latestDecision = await this.sessionRepository.findLatestActiveSessionAdminDecision(
      input.sessionId,
    );

    const presentationStatus = resolveSessionPresentationStatus({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      now,
      finalManualDecision: latestDecision?.decisionType ?? null,
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
        participants,
        presentationStatus,
      },
    };
  }
}
