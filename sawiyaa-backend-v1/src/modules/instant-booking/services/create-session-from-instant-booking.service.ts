import { Injectable } from '@nestjs/common';
import {
  InstantBookingRequest,
  Prisma,
  SessionEventType,
  SessionFlowType,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { InstantBookingPolicyService } from './instant-booking-policy.service';

/**
 * Accepted instant booking requests create a real Session record so Session remains the booking source of truth.
 * The created session stays payment-honest by starting in PENDING_PAYMENT.
 */
@Injectable()
export class CreateSessionFromInstantBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly instantBookingPolicyService: InstantBookingPolicyService,
  ) {}

  async createFromAcceptedRequest(input: {
    request: InstantBookingRequest;
    actorUserId: string;
    startsAtUtc: Date;
    endsAtUtc: Date;
    timezone: string;
    tx?: Prisma.TransactionClient;
  }) {
    const paymentWindowMinutes = await this.instantBookingPolicyService.paymentWindowMinutes();
    const acceptedAt = new Date();
    const expiresAt = new Date(acceptedAt.getTime() + paymentWindowMinutes * 60 * 1000);
    // The payment hold occupies the interval before the purchased session. The
    // session itself starts at the persisted deadline, so payment wait time can
    // never consume the patient's 30/60 purchased minutes.
    const scheduledStartAt = expiresAt;
    const scheduledEndAt = new Date(scheduledStartAt.getTime() + input.request.requestedDurationMinutes * 60 * 1000);

    const run = async (tx: Prisma.TransactionClient) => {
      const session = await this.sessionRepository.createSession(
        {
          patientId: input.request.patientId,
          practitionerId: input.request.practitionerId,
          flowType: SessionFlowType.INSTANT,
          sessionMode: SessionMode.VIDEO,
          durationMinutes: input.request.requestedDurationMinutes,
          status: SessionStatus.PENDING_PAYMENT,
          requestedStartAt: acceptedAt,
          scheduledStartAt,
          scheduledEndAt,
          expiresAt,
          timezoneSnapshot: input.timezone,
        },
        tx,
        'instant_booking',
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
            paymentWindowMinutes,
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
