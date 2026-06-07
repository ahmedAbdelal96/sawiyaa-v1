import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';
import {
  buildSessionJoinAvailabilityViewModel,
  DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
  resolveSessionPresentationStatus,
} from '../utils/session-join-policy.util';
import { resolveSessionChatAvailability } from '../utils/session-chat-policy.util';
import {
  SessionDetailsViewModel,
  SessionListItemViewModel,
} from '../types/sessions.types';

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
  ): SessionListItemViewModel {
    return {
      id: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
      presentationStatus: resolveSessionPresentationStatus({
        status: session.status,
        sessionMode: session.sessionMode,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        provider: session.provider,
        providerRoomId: session.providerRoomId,
        providerSessionRef: session.providerSessionRef,
        now,
        runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      }),
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
      joinAvailability: buildSessionJoinAvailabilityViewModel({
        status: session.status,
        sessionMode: session.sessionMode,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        provider: session.provider,
        providerRoomId: session.providerRoomId,
        providerSessionRef: session.providerSessionRef,
        now,
        runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      }),
      chatAvailability: resolveSessionChatAvailability({
        status: session.status,
        sessionMode: session.sessionMode,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        provider: session.provider,
        providerRoomId: session.providerRoomId,
        providerSessionRef: session.providerSessionRef,
        now,
        runtimePrepareLeadMinutes: DEFAULT_SESSION_RUNTIME_PREPARE_LEAD_MINUTES,
      }),
    };
  }

  toDetails(
    session: SessionWithRelations,
    now = new Date(),
  ): SessionDetailsViewModel {
    const base = this.toListItem(session, now);

    return {
      ...base,
      flowType: session.flowType,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      cancelledAt: session.cancelledAt?.toISOString() ?? null,
      cancellationReason: session.cancellationReason ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      expiredAt: session.expiredAt?.toISOString() ?? null,
      timezone: session.timezoneSnapshot ?? null,
    };
  }
}
