import { Injectable } from '@nestjs/common';
import { InstantBookingRequest, SessionMode } from '@prisma/client';
import { InstantBookingRequestViewModel } from '../types/instant-booking.types';

type InstantBookingRequestWithRelations = InstantBookingRequest & {
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
  } | null;
};

@Injectable()
export class InstantBookingMapper {
  toViewModel(
    request: InstantBookingRequestWithRelations,
  ): InstantBookingRequestViewModel {
    return {
      id: request.id,
      status: request.status,
      requestedDurationMinutes: request.requestedDurationMinutes,
      sessionMode: request.preferredMode,
      requestedAt: request.requestedAt.toISOString(),
      expiresAt: request.expiresAt.toISOString(),
      respondedAt: request.respondedAt?.toISOString() ?? null,
      responseReason: request.responseReason ?? null,
      createdSessionId: request.linkedSessionId ?? null,
      practitioner: {
        id: request.practitioner.id,
        slug: request.practitioner.publicSlug,
        displayName: request.practitioner.user.displayName ?? null,
      },
      patient: request.patient
        ? {
            id: request.patient.id,
            displayName: request.patient.user.displayName ?? null,
          }
        : null,
    };
  }
}
