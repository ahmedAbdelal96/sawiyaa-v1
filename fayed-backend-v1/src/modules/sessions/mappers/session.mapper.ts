import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';
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
  toListItem(session: SessionWithRelations): SessionListItemViewModel {
    return {
      id: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
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
    };
  }

  toDetails(session: SessionWithRelations): SessionDetailsViewModel {
    const base = this.toListItem(session);

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
