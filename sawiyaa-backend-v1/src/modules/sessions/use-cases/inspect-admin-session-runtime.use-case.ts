import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { ResolveSessionJoinReadinessService } from '../services/resolve-session-join-readiness.service';
import { buildParticipantsSummary, type SessionWithParticipants } from '../utils/session-participant-identity.util';

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
      videoRoomClosedAt: session.videoRoomClosedAt,
      now,
    });

    const participants = buildParticipantsSummary(
      session as unknown as SessionWithParticipants,
    );
    const packagePurchase = session.packagePurchase
      ? {
          id: session.packagePurchase.id,
          status: session.packagePurchase.status,
          selectedCurrencyCode: session.packagePurchase.selectedCurrencyCode ?? null,
          sessionCountSnapshot: session.packagePurchase.sessionCountSnapshot ?? null,
          patientPayableTotalSnapshot:
            session.packagePurchase.patientPayableTotalSnapshot?.toString() ?? null,
          packagePlan: {
            id: session.packagePurchase.packagePlan!.id,
            code: session.packagePurchase.packagePlan!.code,
            title: session.packagePurchase.packagePlan!.title,
            sessionCount: session.packagePurchase.packagePlan!.sessionCount,
            discountPercent:
              session.packagePurchase.packagePlan!.discountPercent?.toString() ?? null,
          },
        }
      : null;

    const packageEntitlementDecision = (session as any).packageEntitlementDecision
      ? {
          id: (session as any).packageEntitlementDecision.id,
          sessionId: (session as any).packageEntitlementDecision.sessionId,
          packagePurchaseId: (session as any).packageEntitlementDecision.packagePurchaseId,
          sessionStatusSnapshot: (session as any).packageEntitlementDecision.sessionStatusSnapshot,
          decisionType: (session as any).packageEntitlementDecision.decisionType,
          reasonCode: (session as any).packageEntitlementDecision.reasonCode,
          adminNote: (session as any).packageEntitlementDecision.adminNote,
          resultingSessionEarningReviewId:
            (session as any).packageEntitlementDecision.resultingSessionEarningReviewId,
          decidedBy: {
            userId: (session as any).packageEntitlementDecision.decidedByUser.id,
            displayName: (session as any).packageEntitlementDecision.decidedByUser.displayName,
          },
          decidedAt: (session as any).packageEntitlementDecision.decidedAt.toISOString(),
          idempotencyKey: (session as any).packageEntitlementDecision.idempotencyKey,
        }
      : null;

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
        // Deprecated compatibility alias. It is never used to derive actions.
        presentationStatus: session.status,
        packagePurchase,
        packageEntitlementDecision,
        paymentCoverageType: session.paymentCoverageType,
        packageSessionIndex: session.packageSessionIndex ?? null,
        packageSessionCount: session.packageSessionCount ?? null,
      },
    };
  }
}
