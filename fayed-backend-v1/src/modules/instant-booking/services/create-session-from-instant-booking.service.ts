import { Injectable } from '@nestjs/common';
import {
  InstantBookingRequest,
  Prisma,
  SessionEventType,
  SessionFlowType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';

/**
 * Accepted instant booking requests create a real Session record so Session remains the booking source of truth.
 * The created session stays payment-honest by starting in PENDING_PAYMENT.
 */
@Injectable()
export class CreateSessionFromInstantBookingService {
  private readonly paymentReservationMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async createFromAcceptedRequest(input: {
    request: InstantBookingRequest;
    actorUserId: string;
    startsAtUtc: Date;
    endsAtUtc: Date;
    timezone: string;
    tx?: Prisma.TransactionClient;
  }) {
    const expiresAt = new Date(
      Date.now() + this.paymentReservationMinutes * 60 * 1000,
    );

    const run = async (tx: Prisma.TransactionClient) => {
      const sessionCode = await this.sessionRepository.reserveNextSessionCode(
        input.startsAtUtc,
        tx,
      );

      const session = await this.sessionRepository.createSession(
        {
          sessionCode,
          patientId: input.request.patientId,
          practitionerId: input.request.practitionerId,
          flowType: SessionFlowType.INSTANT,
          sessionMode: input.request.preferredMode,
          durationMinutes: input.request.requestedDurationMinutes,
          status: SessionStatus.PENDING_PAYMENT,
          requestedStartAt: input.startsAtUtc,
          scheduledStartAt: input.startsAtUtc,
          scheduledEndAt: input.endsAtUtc,
          expiresAt,
          timezoneSnapshot: input.timezone,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: session.id,
          eventType: SessionEventType.SESSION_CREATED,
          actorUserId: input.actorUserId,
          metadataJson: {
            source: 'instantBookingAccepted',
            instantBookingRequestId: input.request.id,
          },
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: session.id,
          eventType: SessionEventType.PAYMENT_PENDING,
          actorUserId: input.actorUserId,
          metadataJson: {
            expiresAt: expiresAt.toISOString(),
            instantBookingRequestId: input.request.id,
          },
        },
        tx,
      );

      return session;
    };

    if (input.tx) {
      return run(input.tx);
    }

    return this.prisma.$transaction(run);
  }
}
