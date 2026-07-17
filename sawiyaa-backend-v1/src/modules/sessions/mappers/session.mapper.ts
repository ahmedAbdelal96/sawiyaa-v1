import { Injectable } from '@nestjs/common';
import { Session, SessionAdminDecisionType } from '@prisma/client';
import {
  buildSessionJoinAvailabilityViewModel,
  DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
} from '../utils/session-join-policy.util';
import { resolveSessionChatAvailability } from '../utils/session-chat-policy.util';
import {
  SessionDetailsViewModel,
  SessionListItemViewModel,
} from '../types/sessions.types';
import type { PatientSessionActionsViewModel } from '../services/resolve-patient-session-actions.service';

type SessionWithRelations = Session & {
  practitioner: {
    id: string;
    publicSlug: string;
    user: {
      displayName: string | null;
    };
  };
  patient: {
    id: string;
    user: {
      displayName: string | null;
    };
  };
};

@Injectable()
export class SessionMapper {
  toListItem(
    session: SessionWithRelations,
    now = new Date(),
    unreadCount = 0,
    finalManualDecision: SessionAdminDecisionType | null = null,
    actions?: PatientSessionActionsViewModel,
  ): SessionListItemViewModel {
    const joinAvailability = buildSessionJoinAvailabilityViewModel({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      videoRoomClosedAt: session.videoRoomClosedAt,
      now,
      runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      finalManualDecision,
    });

    return {
      id: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
      // Compatibility only: this no longer derives a competing display state.
      presentationStatus: session.status,
      createdAt: session.createdAt.toISOString(),
      scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
      durationMinutes: session.durationMinutes,
      sessionMode: session.sessionMode,
      practitioner: {
        id: session.practitioner.id,
        slug: session.practitioner.publicSlug,
        displayName: session.practitioner.user.displayName ?? null,
      },
      patient: {
        id: session.patient.id,
        displayName: session.patient.user.displayName ?? null,
      },
      joinAvailability,
      actions: actions ?? {
        canCancel: false,
        canPrepareRoom: false,
        canJoin: joinAvailability.canJoin,
        canPay:
          session.status === 'PENDING_PAYMENT' &&
          Boolean(session.expiresAt && session.expiresAt > now),
        canReview: false,
      },
      chatAvailability: resolveSessionChatAvailability({
        status: session.status,
        sessionMode: session.sessionMode,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        provider: session.provider,
        providerRoomId: session.providerRoomId,
        providerSessionRef: session.providerSessionRef,
        videoRoomClosedAt: session.videoRoomClosedAt,
        now,
        runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      }),
      unreadCount,
      hasUnread: unreadCount > 0,
    };
  }

  toDetails(
    session: SessionWithRelations,
    now = new Date(),
    unreadCount = 0,
    finalManualDecision: SessionAdminDecisionType | null = null,
    actions?: PatientSessionActionsViewModel,
  ): SessionDetailsViewModel {
    const base = this.toListItem(
      session,
      now,
      unreadCount,
      finalManualDecision,
      actions,
    );

    return {
      ...base,
      flowType: session.flowType,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      cancelledAt: session.cancelledAt?.toISOString() ?? null,
      cancellationReason: session.cancellationReason ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      expiredAt: session.expiredAt?.toISOString() ?? null,
      timezone: session.timezoneSnapshot ?? null,
      videoRoomClosedAt: session.videoRoomClosedAt?.toISOString() ?? null,
      videoRoomCloseReason: session.videoRoomCloseReason ?? null,
      videoRoomCloseNote: session.videoRoomCloseNote ?? null,
    };
  }
}
